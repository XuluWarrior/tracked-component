import { createCache, getValue, validateTag, Tag, Revision } from "@glimmer/validator";

import {setPropertyDidChange, tracked} from './tracked.js';

import {
  createRef,
  RefObject,
  useEffect,
  useContext,
  useState,
  forwardRef,
  PropsWithoutRef,
  ReactNode,
  Context
} from "react";


export abstract class TrackedComponent {
  // static abstract componentClass

  abstract render(): ReactNode

  onMount(): void { }

  onDismount(): void { }

  cache = createCache<ReactNode>(this.render.bind(this))

  tagSymbol = Object.getOwnPropertySymbols(this.cache).find(symbol => symbol.description === "TAG")!

  snapshotSymbol = Object.getOwnPropertySymbols(this.cache).find(symbol => symbol.description === "SNAPSHOT")!

  get tag(): Tag {
    return (this.cache as any)[this.tagSymbol] as Tag;
  }

  get snapshot(): Revision {
    return (this.cache as any)[this.snapshotSymbol] as Revision;
  }

  @tracked
  props: PropsWithoutRef<unknown>

  get cachedRender(): ReactNode {
    return getValue(this.cache)
  }

  // private applyEffects(): void {
  //   console.log('applyEffects')
  //   for (const [fn, depsPaths] of Object.values(this.effects)) {
  //     const deps = depsPaths.length === 0
  //       ? undefined
  //       : depsPaths.map(path => getFromPathParts(this, path))
  //     useEffect(fn.bind(this), deps)
  //   }
  // }
  //
  private applyContext(): void {
    for (const [propName, context] of Object.entries((this as any).contexts)) {
      (this as any)[propName]  = useContext(context as Context<unknown>)
    }
  }

  toComponentFn() {
    return (props: any) => {
      setPropertyDidChange(() => {});
      this.props = props;
      const [state, rerender] = useState(0);
      setPropertyDidChange(() => {
        if (!validateTag(this.tag, this.snapshot)) {
          rerender(window.performance.now())
        }
      });
      useEffect(() => {
        this.onMount();
        return this.onDismount;
      }, [])
      // this.applyEffects();
      this.applyContext();

      return this.cachedRender
    }
  }

  static toComponentFn() {
    const trackedComponent = new (this as any)
    return trackedComponent.toComponentFn()
  }
}

export abstract class TrackedComponentWithForwardRef extends TrackedComponent {
  ref!: RefObject<unknown>

  override toComponentFn() {
    const fnWithRef = (props: PropsWithoutRef<unknown>, ref: RefObject<unknown>) => {
      this.ref = ref;
      return super.toComponentFn()(props)
    }
    return forwardRef(fnWithRef as any)
  }
}

function getFromPathParts(target: any, parts: string): any {
  return parts.split('.').reduce((nextTarget, part) => {
    return nextTarget?.[part];
  }, target);
}

type MethodDecoratorArgs = [target: any, propertyKey: string, descriptor: PropertyDescriptor]

export function context(context: Context<unknown>) {
  return (...args: MethodDecoratorArgs): void => {
    const [target, key, _descriptor] = args;
    if (!target.contexts) {
      target.contexts = [];
    }
    target.contexts[key] = context;
  }
}

export function ref([_target, key, descriptor]: MethodDecoratorArgs): void {
  (descriptor as any).initializer = (): RefObject<unknown> => createRef();
}