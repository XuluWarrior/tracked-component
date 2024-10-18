import { action } from "./action";
import { tracked } from "./tracked";
import { useState } from "react";

export function trackable<TStore extends Record<string, any>>(obj: TStore): TStore {
    const trackableObj: TStore = {} as any;
    for (const key of Object.getOwnPropertyNames(obj)) {
        const desc = Object.getOwnPropertyDescriptor(obj, key)!
        if (desc.get || desc.set) {
            Object.defineProperty(trackableObj, key, desc)
        } else if (typeof desc.value === "function") {
            Object.defineProperty(trackableObj, key, action(trackableObj, key, desc))
        } else {
            const descWithInitializer = {
                ...desc,
                initializer: () => desc.value
            }
            Object.defineProperty(trackableObj, key, tracked(trackableObj, key, descWithInitializer)!)
        }
    }
    return trackableObj as TStore;
}

export function useLocalTrackable<TStore extends Record<string, any>>(
    initializer: () => TStore,
): TStore {
    return useState(() => trackable(initializer()))[0]
}
