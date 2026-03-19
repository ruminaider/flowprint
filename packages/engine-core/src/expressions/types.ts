export interface ParsedExpression {
  /** The original source expression */
  source: string
  /** Top-level identifiers referenced (e.g., 'input', 'validate_order') */
  identifiers: string[]
  /** Member paths referenced (e.g., 'input.priority', 'validate_order.isValid') */
  memberPaths: string[]
}

export interface ExpressionError {
  message: string
  position?: number
}

export type ParseResult =
  | { success: true; expression: ParsedExpression }
  | { success: false; errors: ExpressionError[] }
