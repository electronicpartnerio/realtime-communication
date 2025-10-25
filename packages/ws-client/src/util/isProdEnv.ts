export const isProdEnv = (env?: string): boolean => {
    if (env) return env === 'production';
    return (
        import.meta?.env?.MODE === 'production' ||
        process.env.NODE_ENV === 'production'
    );
};