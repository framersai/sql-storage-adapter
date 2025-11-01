export class StorageResolutionError extends Error {
    constructor(message, causes = []) {
        super(message);
        this.causes = causes;
        this.name = 'StorageResolutionError';
    }
}
//# sourceMappingURL=types.js.map