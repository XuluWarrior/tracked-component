const BINDINGS_MAP = new WeakMap();
function hasProto(obj) {
  return obj != null && obj.constructor !== undefined && typeof obj.constructor.proto === 'function';
}
function setupAction(target, key, actionFn) {
  if (hasProto(target)) {
    target.constructor.proto();
  }
  if (!Object.prototype.hasOwnProperty.call(target, 'actions')) {
    const parentActions = target.actions;
    // we need to assign because of the way mixins copy actions down when inheriting
    target.actions = parentActions ? Object.assign({}, parentActions) : {};
  }
  target.actions[key] = actionFn;
  return {
    get() {
      let bindings = BINDINGS_MAP.get(this);
      if (bindings === undefined) {
        bindings = new Map();
        BINDINGS_MAP.set(this, bindings);
      }
      let fn = bindings.get(actionFn);
      if (fn === undefined) {
        fn = actionFn.bind(this);
        bindings.set(actionFn, fn);
      }
      return fn;
    }
  };
}
export function action(...args) {
  const [target, key, desc] = args;
  const actionFn = desc === null || desc === void 0 ? void 0 : desc.value;

  // SAFETY: TS types are weird with decorators. This should work.
  return setupAction(target, key, actionFn);
}
// SAFETY: TS types are weird with decorators. This should work.
// setClassicDecorator(action);
