import { ValidationError } from '../utils/AppError.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      throw new ValidationError('Dados inválidos.', result.error.flatten().fieldErrors);
    }
    req[source] = result.data;
    return next();
  };
}
