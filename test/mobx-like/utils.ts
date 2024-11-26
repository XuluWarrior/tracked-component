import { configure } from "mobx"

export function resetMobx(): void {
    configure({ enforceActions: "never" })
}

import {trackable} from "../../src";

export function enableDevEnvironment() {
    process.env.NODE_ENV === "development"
    return function() {
        process.env.NODE_ENV === "production"
    }
}

export function sleep(time: number) {
    return new Promise<void>(res => {
        setTimeout(res, time)
    })
}

export class Box<T> {
    private trackedObj!: { val: T}
    get(): T {
        return this.trackedObj.val
    }
    set(val: T): void {
        this.trackedObj.val = val;
    }
    constructor(val: T) {
        this.trackedObj = trackable({val})
    }
}