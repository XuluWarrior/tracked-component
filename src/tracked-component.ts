import {
    createElement,
    FunctionComponent,
    memo as reactMemo,
    ReactNode, RefObject, useContext,
    useEffect,
    useRef,
    useState
} from "react";

import { bound } from "@xuluwarrior/basic/src/decorators"
import {Consumer, trackItems} from "@xuluwarrior/tracked";

import {HasReactContext} from "./context-provider";

function updateChanged<T extends Record<any,any>>(oldObj: T, newObj: T): void {
    for (const [key, newValue] of Object.entries(newObj)) {
        if (oldObj[key] !== newValue) {
            console.log(`${key} changed from ${oldObj[key]} to ${newValue}`)
            oldObj[key as keyof T] = newValue;
        }
    }
}

function named<T extends Function>(name: string, fn: T): T {
    Object.defineProperty(fn, "name", {value: name});
    return fn;
}

export abstract class TrackedComponent<P extends object> {
    abstract render(): ReactNode

    private firstRender = true;

    public requiredContext = new Map<HasReactContext<any>, any>()

    rerender = (_count: number) => {}

    constructor() {
        this.consumer.addListener(this.onConsumerDirtied)
    }

    // To be overriden by child components
    onMount(): void {}
    onDismount(): void {}

    // onMount/Dismount behaviour that we can't let me lost due overrides
    #onMount(): void {
        console.log("mount")

        // In dev mode on render is called twice followed by onMount/onDismount/onMount
        // As dismount clears the listeners, we need to ensure they are added by the end of the second onMount
        this.consumer.addListener(this.onConsumerDirtied)
    }

    #onDismount(): void {
        console.log("dismount")
        // TODO: Destroy consumer properly
        this.consumer.listeners.clear();
    }

    @bound
    onConsumerDirtied() {
        // If props were changed we will already have rerendered
        // We can check this by seeing in the consumer is still dirty
        if (this.consumer.isDirty) {
            this.rerender(Date.now())
        }
    }

    props: P = trackItems({} as P, "onChanged")

    consumer = new Consumer(
        named(`${this.constructor.name}-render`, () => this.render())
    )

    @bound
    updateProps(_prevProps: P, newProps: P) {
        updateChanged(this.props, newProps);
        return !this.consumer.isDirty  //
    }

    toComponentFn() {
        return reactMemo(named(`${this.constructor.name}-memoised`, (props: P) => {
            if (this.firstRender) {
                updateChanged(this.props, props)
                this.firstRender = false;
            }

            const [_state, rerender] = useState(0);

            this.rerender = rerender

            useEffect(() => {
                this.#onMount();
                this.onMount();
                return () => {
                    this.#onDismount();
                    this.onDismount();
                }
            }, [])

            for (const contextProvider of this.requiredContext.keys()) {
                this.requiredContext.set(contextProvider, useContext(contextProvider.reactContext).value)
            }
            return this.consumer.getValue()
        }), this.updateProps)
    }

    static toComponentFn() {
        return named(this.name, (...args: any[]) => {
            const ref = useRef((new (this as any)).toComponentFn());

            const element = createElement(ref.current, args[0])
            return element
        })
    }

    static $$typeof = Symbol.for("react.memo")
    static get type() {
        return this.toComponentFn()
    }
}

export function trackedComponent<P>(renderFn: FunctionComponent<P>) {
    return reactMemo(
        named(`${renderFn.name}-memoised`, (props: P) => {
            const [state, rerender] = useState(0);
            const propsContainer = useRef({ props });
            propsContainer.current.props = props;
            function getPropsFromRef(ref: RefObject<{ props: P}>) {
                return ref.current.props
            }
            const consumerRef = useRef(
                new Consumer(named(`${renderFn.name}-render`, () =>
                    renderFn(getPropsFromRef(propsContainer))
                ))
            )
            consumerRef.current.listeners.clear();
            consumerRef.current.addListener(() =>
                rerender(state + 1))

            return consumerRef.current.getValue()
        })
    )
}

export function useTracking<T extends ReactNode>(fn: () => T) {
    const ref = useRef(trackedComponent(fn));

    return createElement(ref.current!);
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
