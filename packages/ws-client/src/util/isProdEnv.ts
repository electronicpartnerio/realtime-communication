export const isProdEnv = (env?: string): boolean => {
    if (env) return env === 'production';

    return (
        // @ts-ignore
        import.meta?.env?.MODE === 'production'
    );
};