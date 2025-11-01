export const normaliseParameters = (parameters) => {
    if (parameters == null) {
        return {};
    }
    if (Array.isArray(parameters)) {
        return { positional: parameters };
    }
    if (typeof parameters === 'object') {
        return { named: parameters };
    }
    return { positional: [parameters] };
};
//# sourceMappingURL=parameterUtils.js.map