export class HttpError extends Error {
    status;
    code;
    fieldErrors;
    constructor(status, code, message, fieldErrors) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.code = code;
        this.fieldErrors = fieldErrors;
    }
}
