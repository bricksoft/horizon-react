
const horizonSub = (data) => ({
  watch() {
    return {
      forEach(fn) {
        fn(data);
      }
    };
  }
});

function HorizonMock(opts = {}) {
  const hzInterface = () => ({
    findAll() {
      return horizonSub(opts.data);
    },
    ...horizonSub(opts.data)
  });

  hzInterface.status = opts.status ? opts.status : () => ({
    getValue() {
      return { type: 'ready' };
    }
  });
  hzInterface.onReady = () => {};
  hzInterface.onDisconnected = () => {};
  hzInterface.onSocketError = () => {};

  return hzInterface;
}

export default HorizonMock;
export { horizonSub };
