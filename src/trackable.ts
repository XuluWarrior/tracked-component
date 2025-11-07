import  { consumed, dirtyProp } from "@xuluwarrior/tracked";
import { useState } from "react";


export function trackable<T extends Record<string|symbol|number, any>>(a: T = {} as T): T {
    const trackingSymbols: Record<symbol|string|number, symbol> = {}
    function ensureKey(propertyKey: string | symbol) {
        if (!trackingSymbols[propertyKey]) {
            trackingSymbols[propertyKey] = Symbol(`tracked-${propertyKey.toString()}`)
        }
        return trackingSymbols[propertyKey];
    }

    const trackableHandler = {
        get(target: T, propertyKey: string | symbol, receiver?: unknown) {

            consumed(ensureKey(propertyKey))
            const value =  Reflect.get(target, propertyKey, receiver);
            return typeof value === "function" ? (value as Function).bind(receiver) : value
        },
        set(target: T, propertyKey: string | symbol, value: any, receiver?: unknown) {
            dirtyProp(ensureKey(propertyKey));
            return Reflect.set(target, propertyKey, value, receiver);
        }
    };
    return new Proxy(a, trackableHandler);
}

export function useLocalTrackable<TStore extends Record<string, any>>(
    initializer: () => TStore,
): TStore {
    const [state] = useState(trackable(initializer()))
    return state;
}
