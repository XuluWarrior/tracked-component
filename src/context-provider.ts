import {Context, createContext, createElement, PropsWithChildren, ReactNode, useContext, useRef} from "react";
import {TrackedComponent} from "./tracked-component";
import {trackedRecord} from "@xuluwarrior/tracked";

export abstract class ContextProvider<T,V> extends TrackedComponent<PropsWithChildren<T>> {
    static get reactContext(): Context<any> {
        const thisish = this as any;
        const privateContextName = `context (${this.name})`
        if (!thisish[privateContextName]) {
            thisish[privateContextName] = createContext(trackedRecord({value: null}, `${this.name}-context-provider`))
        }
        return thisish[privateContextName];
    }

    static useContext<C>() {
        const currentContext = useContext<{ value: C}>((this as any).reactContext)
        if (currentContext === null) {
            throw new Error("useContext must be used within provider "); //"useReviewDocumentContext must be used within ReviewDocumentProvider");
        }
        return currentContext.value
    }

    private get reactContext() {
        return (this.constructor as any).reactContext as Context<{ value: V | null }>
    }

    abstract getContext(): V

    renderProvider(children: ReactNode) {
        const {Provider} = this.reactContext;
        const contextContent = useContext(this.reactContext);
        const currentValue = this.getContext();
        if (contextContent.value !== currentValue) {
            contextContent.value = this.getContext()
        }
        return createElement(Provider, { value: contextContent}, children)
    }

    render() {
        return this.renderProvider(this.props.children)
    }

    static override toComponentFn<C = unknown>() {
        const componentFn = super.toComponentFn();
        const extendedFn: typeof componentFn & { useContext: () => C, reactContext: Context<C>} = componentFn as any


        extendedFn.useContext = (this as any).useContext.bind(this);
        extendedFn.reactContext = (this as any).reactContext;
        return extendedFn
    }
}

export type HasReactContext<V> = { reactContext: Context<V> }

export function context<V>(contextProvider: HasReactContext<V>) {
    return function <T extends TrackedComponent<any> = TrackedComponent<any>>(originalAccessor: ClassAccessorDecoratorResult<T, V>, context: ClassAccessorDecoratorContext<T, V>) {
        context.addInitializer(function () {
            this.requiredContext.set(contextProvider, undefined)
        });

        return {
            get() {
                return this.requiredContext.get(contextProvider)
            }
        } as ClassAccessorDecoratorResult<T, V>;
    }
}