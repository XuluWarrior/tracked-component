import {Context, createContext, createElement, PropsWithChildren, useContext, useRef} from "react";
import {TrackedComponent} from "./tracked-component";
import {trackedRecord} from "@xuluwarrior/tracked";

export abstract class ContextProvider<T extends PropsWithChildren, V> extends TrackedComponent<T> {
    constructor(private context:Context<{ value: V | null }> ) {
        super();
    }

    abstract getValue(): V

    // useContext(): V {
    //     consumed(this.trackingSymbol);
    //     const context = useContext(this.context)
    //     if (context === null) {
    //         throw new Error("useContext must be used within provider "); //"useReviewDocumentContext must be used within ReviewDocumentProvider");
    //     }
    //     return context;
    // }

    render() {
        const { Provider } = this.context;
        const context = useContext(this.context);
        const currentValue = this.getValue();
        if (context.value !== currentValue) {
            context.value = this.getValue()
        }
        return createElement(Provider, { value: context}, this.props.children)
    }

    static override toComponentFn<C = unknown>() {
        console.log("It begins")
        const context =
            createContext<{value: C | null} | null>(trackedRecord({value: null}, "context-provider"))
        const componentFn = (...args: any[]) => {
            const ref = useRef((new (this as any)(context).toComponentFn()));

            const element = createElement(ref.current, args[0])
            // return createElement(ref.current, args[0])
            return element
        }
        componentFn.useContext = () => {
            const currentContext = useContext(context)
            if (currentContext === null) {
                throw new Error("useContext must be used within provider "); //"useReviewDocumentContext must be used within ReviewDocumentProvider");
            }
            return currentContext.value
        }
        return componentFn
    }
}