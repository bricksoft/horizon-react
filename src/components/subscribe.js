import isEqual from 'lodash.isequal';
import isPlainObject from 'is-plain-object';
import { Component, createElement } from 'react';
import PropTypes from 'prop-types';

import requireResolve from '../utils/requireResolve';

const emptyArray = [];
const getDisplayName = WrappedComponent => WrappedComponent.displayName ||
  WrappedComponent.name ||
  'Component';

/**
 * Subscribes to data specified in mapData
 */
export default function subscribe(opts = {}) {
  const { mapDataToProps } = opts;

  delete opts.mapDataToProps;

  return (TargetComponent) => {
    class DataSubscriber extends Component {
      // make sure react prints parent component name on error/warnings
      static displayName = `subscribe(DataSubscriber(${getDisplayName(TargetComponent)}))`;

      static contextTypes = {
        horizon: PropTypes.func,
        store: PropTypes.object
      };

      constructor(props, context) {
        super(props, context);

        this.client = props.client || context.horizon;
        this.store = props.store || context.store;
        this.subscriptions = {};
        this.data = {};
        this.mutations = {};

        this.state = {
          subscribed: false,
          updates: 0,
          data: this.getDataNames(props),
        };
      }

      componentWillMount() {
        this.subscribe(this.props);
      }

      componentWillReceiveProps(nextProps) {
        if (!isEqual(nextProps, this.props)) {
          this.subscribe(nextProps);
        }
      }

      componentWillUnmount() {
        // make sure to dispose all subscriptions
        this.unsubscribe(false);
      }

      render() {
        return createElement(TargetComponent, {
          ...this.props,
          ...this.state.data,
          horizon: this.client
        });
      }

      getDataNames(props) {
        if (Array.isArray(mapDataToProps)) {
          return mapDataToProps.reduce(
            (acc, s) => { acc[s.name] = []; return acc; },
            {}
          );
        } else if (isPlainObject(mapDataToProps)) {
          return this.getObjectWithDataKeys(
            Object.keys(mapDataToProps)
          );
        } else if (typeof mapDataToProps === 'function') {
          return this.getObjectWithDataKeys(
            Object.keys(mapDataToProps(props))
          );
        }
        return null;
      }

      getObjectWithDataKeys(keys) {
        return keys.reduce((acc, name) => {
          acc[name] = [];
          return acc;
        }, {});
      }

      /**
       * Walk through all elements in mapData and set up
       * the subscriptions which should fire setState() every
       * time data changes.
       */
      subscribe(props) {
        if (isPlainObject(mapDataToProps)) {
          this.subscribeToObject(props);
        } else if (typeof mapDataToProps === 'function') {
          this.subscribeToFunction(props);
        }

        this.setState({ subscribed: true });
      }

      /**
       * Unsubscribe from all subscriptions.
       */
      unsubscribe(updateState = true) {
        Object.keys(this.subscriptions).forEach(k => {
          if (this.subscriptions[k].subscription.dispose) {
            this.subscriptions[k].subscription.dispose();
          }
        });

        if (updateState) {
          this.setState({ subscribed: false });
        }
      }

      /**
       * Query is written as an object.
       *
       * Example:
       *
       * const mapDataToProps = {
       *   todos: hz => hz('todos').findAll(...),
       *   users: (hz, props) => hz('users').limit(5)
       * };
       */
      subscribeToObject(props) {
        Object.keys(mapDataToProps).forEach(
          name => {
            const query = mapDataToProps[name];
            this.handleQuery(query(this.client, props), name);
          }
        );
      }

      subscribeToFunction(props) {
        const data = mapDataToProps(props);
        Object.keys(data).forEach(
          name => {
            const query = data[name];
            this.handleQuery(query(this.client, props), name);
          }
        );
      }

      /**
       * Builds the query and sets up the callback when data
       * changes come in.
       * If the query is the same as the old one, we keep the old one
       * and ignore the new one.
       */
      handleQuery(query, name) {
        if (this.subscriptions[name]) {
          const prevQuery = this.subscriptions[name].query;

          // if the new query is the same as the previous one,
          // we keep the previous one
          if (isEqual(prevQuery, query._query)) return; // eslint-disable-line no-underscore-dangle
        }

        this.subscriptions[name] = {
          subscription: query
            .watch()
            .forEach(this.handleData.bind(this, name)),
          query: query._query // eslint-disable-line no-underscore-dangle
        };
      }

      /**
       * When new data comes in, we update the state of this component,
       * this will cause a rerender of it's child component with the new
       * data in props.
       */
      handleData = (name, docs) => {
        let data = docs || emptyArray;

        // always return an array, even if there's just one document
        if (isPlainObject(docs)) {
          data = [docs];
        }

        this.setState({
          data: {
            ...this.state.data,
            [name]: data
          }
        });
      };
    }

    return DataSubscriber;
  };
}
