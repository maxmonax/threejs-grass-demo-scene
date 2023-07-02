
export type Callbacks = {
    onProgress?: (aProgress: number) => void,
    onComplete?: () => void,
    onError?: (aError?: any) => void,
    context?: any
};