/**
 * Derived from https://github.com/emberjs/ember.js/blob/main/packages/%40ember/object/index.ts
 */

import { assert } from './debug';

export type DecoratorPropertyDescriptor = (PropertyDescriptor & { initializer?: any }) | undefined;

export type ElementDescriptor = [
    target: object,
    propertyName: string,
    descriptor?: DecoratorPropertyDescriptor
];

/**
 Decorator that turns the target function into an Action which can be accessed
 directly by reference.

 ```js
 import Component from '@ember/component';
 import { tracked } from '@glimmer/tracking';
 import { action } from '@ember/object';

 export default class Tooltip extends Component {
 @tracked isShowing = false;

 @action
 toggleShowing() {
 this.isShowing = !this.isShowing;
 }
 }
 ```
 ```hbs
 <!-- template.hbs -->
 <button {{on "click" this.toggleShowing}}>Show tooltip</button>

 {{#if isShowing}}
 <div class="tooltip">
 I'm a tooltip!
 </div>
 {{/if}}
 ```

 It also binds the function directly to the instance, so it can be used in any
 context and will correctly refer to the class it came from:

 ```js
 import Component from '@ember/component';
 import { tracked } from '@glimmer/tracking';
 import { action } from '@ember/object';

 export default class Tooltip extends Component {
 constructor() {
 super(...arguments);

 // this.toggleShowing is still bound correctly when added to
 // the event listener
 document.addEventListener('click', this.toggleShowing);
 }

 @tracked isShowing = false;

 @action
 toggleShowing() {
 this.isShowing = !this.isShowing;
 }
 }
 ```

 @public
 @method action
 @for @ember/object
 @static
 @param {Function|undefined} callback The function to turn into an action,
  when used in classic classes
 @return {PropertyDecorator} property decorator instance
 */

const BINDINGS_MAP = new WeakMap();

interface HasProto {
    constructor: {
        proto(): void;
    };
}

function hasProto(obj: unknown): obj is HasProto {
    return (
        obj != null &&
        (obj as any).constructor !== undefined &&
        typeof ((obj as any).constructor as any).proto === 'function'
    );
}

interface HasActions {
    actions: Record<string | symbol, unknown>;
}

function setupAction(
    target: Partial<HasActions>,
    key: string | symbol,
    actionFn: Function
): TypedPropertyDescriptor<unknown> {
    if (hasProto(target)) {
        target.constructor.proto();
    }

    if (!Object.prototype.hasOwnProperty.call(target, 'actions')) {
        let parentActions = target.actions;
        // we need to assign because of the way mixins copy actions down when inheriting
        target.actions = parentActions ? Object.assign({}, parentActions) : {};
    }

    assert("[BUG] Somehow the target doesn't have actions!", target.actions != null);

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
        },
    };
}

export function action(
    target: ElementDescriptor[0],
    key: ElementDescriptor[1],
    desc: ElementDescriptor[2]
): PropertyDescriptor {
    let actionFn: object | Function;

    actionFn = desc?.value;

    assert(
        'The @action decorator must be applied to methods when used in native classes',
        typeof actionFn === 'function'
    );

    // SAFETY: TS types are weird with decorators. This should work.
    return setupAction(target, key, actionFn);
}

