import  { trackedRecord } from "@xuluwarrior/tracked";
import { useState } from "react";

export const trackable = trackedRecord

export function useLocalTrackable<TStore extends Record<string, any>>(
    initializer: () => TStore,
): TStore {
    return useState(() => trackable(initializer()))[0]
}
