import {
    createElement,
    FunctionComponent,
    memo as reactMemo,
    ReactNode, RefObject,
    useEffect,
    useRef,
    useState
} from "react";

import {Consumer} from "@xuluwarrior/tracked";

export abstract class TrackedComponent<P extends object> {
    abstract render(): ReactNode

    rerender = (_count: number) => {}

    onMount(): void {
        console.log("mount")

        console.log("add listener")
        this.consumer.addListener(this.onConsumerDirtied)
    }

    onDismount(): void {
        console.log("dismount")
        // TODO: Destroy consumer properly
        this.consumer.listeners.clear();
    }

    onConsumerDirtied = ()=> {
        this.rerender(Date.now())
    }

    props!: P

    consumer = new Consumer(this.render.bind(this))

    toComponentFn() {
        return reactMemo((props: P) => {
            this.props = props
            const [_state, rerender] = useState(0);

            this.rerender = rerender

            useEffect(() => {
                this.onMount();
                return this.onDismount.bind(this);
            }, [])

            this.consumer.addListener(this.onConsumerDirtied)

            return this.consumer.getValue()
        })
    }

    static toComponentFn() {
        return (...args: any[]) => {
            const ref = useRef((new (this as any)).toComponentFn());

            const element = createElement(ref.current, args[0])
            // return createElement(ref.current, args[0])
            return element
        }
    }

    static $$typeof = Symbol.for("react.memo")
    static get type() {
        return this.toComponentFn()
    }
}

export function trackedComponent<P>(renderFn: FunctionComponent<P>) {
    return reactMemo((props: P) => {
        const [state, rerender] = useState(0);
        const propsContainer = useRef({ props });
        propsContainer.current.props = props;
        function getPropsFromRef(ref: RefObject<{ props: P}>) {
            return ref.current.props
        }
        const consumerRef = useRef(
            new Consumer(() =>
                renderFn(getPropsFromRef(propsContainer))
            )
        )

        consumerRef.current.listeners.clear();
        consumerRef.current.addListener(() =>
            rerender(state + 1))

        return consumerRef.current.getValue()
    })
}

export function useTracking<T extends ReactNode>(fn: () => T) {
  const ref = useRef(trackedComponent(fn));

  return ref.current!({});
}

interface ITrackingProps {
  children?(): React.ReactElement | null
  render?(): React.ReactElement | null
}

export function Tracking({ children, render }: ITrackingProps): ReactNode | null {
  const component = children || render
  if (typeof component !== "function") {
    return null
  }
  return useTracking(component)
}
