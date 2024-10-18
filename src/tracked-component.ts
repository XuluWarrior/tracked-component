import { createCache, getValue, validateTag, Tag, Revision } from "@glimmer/validator";

import {setPropertyDidChange} from './tracked';

import {
  useEffect,
  useRef,
  useState,
  PropsWithoutRef,
  ReactNode,
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
    return (props: any) => {
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
    }
  }

  static toComponentFn() {
    return (...args: any[]) => {
      const ref = useRef<any>();
      if (!ref.current) {
        const trackedComponent = new (this as any)
        ref.current = trackedComponent.toComponentFn();
      }
      return ref.current!(...args)
    }
  }
}
