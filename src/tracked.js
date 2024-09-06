import { DEBUG } from "@glimmer/env";
import { trackedData } from "@glimmer/validator";

let propertyDidChange = function () { };
export function setPropertyDidChange(cb) {
  propertyDidChange = cb;
}

export let tracked = (...args) => {
  let [target, key, descriptor] = args;
  // Error on `@tracked()`, `@tracked(...args)`, and `@tracked get propName()`
  if (DEBUG && typeof target === 'string')
    throwTrackedWithArgumentsError(args);
  if (DEBUG && target === undefined)
    throwTrackedWithEmptyArgumentsError();
  if (DEBUG && descriptor && descriptor.get)
    throwTrackedComputedPropertyError();
  if (descriptor) {
    return descriptorForField(target, key, descriptor);
  }
  else {
    // In TypeScript's implementation, decorators on simple class fields do not
    // receive a descriptor, so we define the property on the target directly.
    Object.defineProperty(target, key, descriptorForField(target, key));
  }
};

function throwTrackedComputedPropertyError() {
  throw new Error(`The @tracked decorator does not need to be applied to getters. Properties implemented using a getter will recompute automatically when any tracked properties they access change.`);
}
function throwTrackedWithArgumentsError(args) {
  throw new Error(`You attempted to use @tracked with ${args.length > 1 ? 'arguments' : 'an argument'} ( @tracked(${args
    .map((d) => `'${d}'`)
    .join(', ')}) ), which is no longer necessary nor supported. Dependencies are now automatically tracked, so you can just use ${'`@tracked`'}.`);
}
function throwTrackedWithEmptyArgumentsError() {
  throw new Error('You attempted to use @tracked(), which is no longer necessary nor supported. Remove the parentheses and you will be good to go!');
}
function descriptorForField(_target, key, desc) {
  if (DEBUG && desc && (desc.value || desc.get || desc.set)) {
    throw new Error(`You attempted to use @tracked on ${String(key)}, but that element is not a class field. @tracked is only usable on class fields. Native getters and setters will autotrack add any tracked fields they encounter, so there is no need mark getters and setters with @tracked.`);
  }
  let { getter, setter } = trackedData(key, desc && desc.initializer);
  return {
    enumerable: true,
    configurable: true,
    get() {
      return getter(this);
    },
    set(newValue) {
      setter(this, newValue);
      propertyDidChange();
    },
  };
}
