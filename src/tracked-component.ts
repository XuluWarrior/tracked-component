import { createCache, getValue, validateTag, Tag, Revision } from "@glimmer/validator";

import { setPropertyDidChange, tracked } from './tracked';

import {
  useEffect,
  useState,
  PropsWithoutRef,
  ReactNode,
} from "react";


export abstract class TrackedComponent {
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

  toComponentFn() {
    return (props: any) => {
      setPropertyDidChange(() => {});
      this.props = props;
      const [state, rerender] = useState(0);
      setPropertyDidChange(() => {
        if (!validateTag(this.tag, this.snapshot)) {
          rerender(state + 1)
        }
      });
      useEffect(() => {
        this.onMount();
        return this.onDismount;
      }, [])

      return this.cachedRender
    }
  }

  static toComponentFn() {
    const trackedComponent = new (this as any)
    return trackedComponent.toComponentFn()
  }
}
