import { createCache, getValue, validateTag, Tag, Revision } from "@glimmer/validator";

import {setPropertyDidChange} from './tracked';

import {
  useEffect,
  useRef,
  useState,
  PropsWithoutRef,
  ReactNode, memo, createElement,
} from "react";


const handlers = new Map<object, ()=>void>()

setPropertyDidChange(() => {
  for (const handler of [...handlers.values()]) {
    handler();
  }
});

export abstract class TrackedComponent {
  abstract render(): ReactNode

  onMount(): void { }

  onDismount(): void { handlers.delete(this) }

  cache = createCache<ReactNode>(this.render.bind(this))

  tagSymbol = Object.getOwnPropertySymbols(this.cache).find(symbol => symbol.description === "TAG")!

  snapshotSymbol = Object.getOwnPropertySymbols(this.cache).find(symbol => symbol.description === "SNAPSHOT")!

  get tag(): Tag {
    return (this.cache as any)[this.tagSymbol] as Tag;
  }

  get snapshot(): Revision {
    return (this.cache as any)[this.snapshotSymbol] as Revision;
  }

  invalidateCache(): void {
    (this.cache as any)[this.snapshotSymbol] = 0;
  }

  props: PropsWithoutRef<unknown>

  get cachedRender(): ReactNode {
    return getValue(this.cache)
  }

  toComponentFn() {
    return memo((props: any) => {
      this.props = props
      this.invalidateCache()
      const [state, rerender] = useState(0);
      const handler = () => {
        if (!validateTag(this.tag, this.snapshot)) {
          rerender(state + 1)
        }
      };
      handlers.set(this, handler)
      useEffect(() => {
        this.onMount();
        return this.onDismount;
      }, [])

      return this.cachedRender
    })
  }

  static toComponentFn() {
    return (...args: any[]) => {
      const ref = useRef((new (this as any)).toComponentFn());

      return createElement(ref.current, args[0])
    }
  }
}

class TrackedComponentFromFn extends TrackedComponent {
  get displayName(): string {
    return this.renderFn.name
  }
  constructor(readonly renderFn: (props: any) => ReactNode) {
    super();
  }

  render(): ReactNode {
    return this.renderFn(this.props)
  }
}

export function trackedComponent(renderFn: (props: any) => ReactNode) {
  return (...args: any[]) => {
    const ref = useRef(new TrackedComponentFromFn(renderFn).toComponentFn());

    return createElement(ref.current, args[0])
  }
}

export function useTracking<T extends ReactNode>(fn: () => T) {
  const ref = useRef(trackedComponent(fn));

  return ref.current!({});
}

export const Tracking = trackedComponent(({children}) => children?.() ?? null)