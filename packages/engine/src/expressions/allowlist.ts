export const ALLOWED_AST_TYPES = new Set([
  'Identifier',
  'MemberExpression',
  'BinaryExpression',
  'LogicalExpression',
  'UnaryExpression',
  'ConditionalExpression',
  'CallExpression',
  'TemplateLiteral',
  'TemplateElement',
  'Literal',
])

export const ALLOWED_BINARY_OPS = new Set(['===', '!==', '>', '<', '>=', '<='])
export const ALLOWED_LOGICAL_OPS = new Set(['&&', '||'])
export const ALLOWED_UNARY_OPS = new Set(['!', 'typeof'])

export const ALLOWED_METHODS = new Set(['includes', 'startsWith', 'endsWith', 'trim'])

export const ALLOWED_MATH_MEMBERS = new Set([
  'abs',
  'ceil',
  'floor',
  'round',
  'trunc',
  'sign',
  'min',
  'max',
  'PI',
  'E',
])

/** Property names blocked from dot-path resolution to prevent prototype chain traversal. */
export const BLOCKED_PROPERTY_NAMES = new Set(['__proto__', 'constructor', 'prototype'])
