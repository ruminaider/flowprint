import type { RulesDataMap } from '@ruminaider/flowprint-editor'

export interface TemplateScenario {
  id: string
  name: string
  description: string
  input: Record<string, unknown>
  fixtures?: Record<string, unknown>
  rulesData?: RulesDataMap
}

const TEMPLATE_SCENARIOS: Record<string, TemplateScenario[]> = {
  // ── Hello World ──────────────────────────────────────
  hello_world: [
    {
      id: 'greeting',
      name: 'Simple Greeting',
      description: 'A user sends their name and receives a greeting',
      input: { name: 'Alice' },
      fixtures: {
        greet_user: { message: 'Hello, Alice!' },
      },
    },
  ],

  // ── Request / Response ───────────────────────────────
  request_response: [
    {
      id: 'success',
      name: 'Successful Request',
      description: 'A GET request is received, processed, and returns a 200 response',
      input: { method: 'GET', path: '/api/users', params: { id: 42 } },
      fixtures: {
        receive_request: { validated: true, requestId: 'req-001' },
        process_request: { users: [{ id: 42, name: 'Alice' }] },
        send_response: { status: 200, body: { id: 42, name: 'Alice' } },
      },
    },
    {
      id: 'large-payload',
      name: 'Large Payload',
      description: 'A POST request with a large payload is processed successfully',
      input: { method: 'POST', path: '/api/import', payload: { records: 500 } },
      fixtures: {
        receive_request: { validated: true, requestId: 'req-002', size: '1.2MB' },
        process_request: { imported: 500, skipped: 0 },
        send_response: { status: 201, body: { imported: 500 } },
      },
    },
  ],

  // ── Approval Workflow ────────────────────────────────
  approval_workflow: [
    {
      id: 'approved',
      name: 'Request Approved',
      description: 'A purchase request is submitted and approved by the reviewer',
      input: { request: { type: 'purchase', amount: 500, requester: 'Alice' } },
      fixtures: {
        submit_request: { requestId: 'REQ-001', submitted: true },
        review_request: { decision: 'Approved', reviewer: 'Bob' },
        check_approval: 'Approved',
        process_approval: { processed: true, orderId: 'ORD-001' },
      },
    },
    {
      id: 'rejected',
      name: 'Request Rejected',
      description: 'A purchase request is submitted but rejected by the reviewer',
      input: { request: { type: 'purchase', amount: 50_000, requester: 'Charlie' } },
      fixtures: {
        submit_request: { requestId: 'REQ-002', submitted: true },
        review_request: { decision: 'Rejected', reviewer: 'Bob', reason: 'Over budget' },
        check_approval: 'Rejected',
        notify_rejection: { notified: true, reason: 'Over budget' },
      },
    },
  ],

  // ── Order Routing ────────────────────────────────────
  order_routing: [
    {
      id: 'express-order',
      name: 'Express Order ($500)',
      description: 'A high-value order routed through express fulfillment',
      input: { order: { id: 'ORD-001', total_amount: 500, customer: 'Alice' } },
      fixtures: {
        receive_order: { orderId: 'ORD-001', validated: true },
        route_order: 'Express',
        fulfill_express: { shipped: true, method: 'overnight' },
        confirm_order: { confirmed: true, eta: '1 business day' },
      },
      rulesData: {
        'rules/routing.rules.yaml': {
          data: {

            hit_policy: 'first',
            inputs: ['order.total_amount'],
            rules: [
              {
                when: { 'order.total_amount': { gte: 200 } },
                then: { classification: 'Express' },
              },
              {
                when: { 'order.total_amount': { gte: 50 } },
                then: { classification: 'Standard' },
              },
              { then: { classification: 'Manual Review' } },
            ],
          },
        },
      },
    },
    {
      id: 'standard-order',
      name: 'Standard Order ($75)',
      description: 'A regular order routed through standard fulfillment',
      input: { order: { id: 'ORD-002', total_amount: 75, customer: 'Bob' } },
      fixtures: {
        receive_order: { orderId: 'ORD-002', validated: true },
        route_order: 'Standard',
        fulfill_standard: { shipped: true, method: 'ground' },
        confirm_order: { confirmed: true, eta: '5-7 business days' },
      },
      rulesData: {
        'rules/routing.rules.yaml': {
          data: {

            hit_policy: 'first',
            inputs: ['order.total_amount'],
            rules: [
              {
                when: { 'order.total_amount': { gte: 200 } },
                then: { classification: 'Express' },
              },
              {
                when: { 'order.total_amount': { gte: 50 } },
                then: { classification: 'Standard' },
              },
              { then: { classification: 'Manual Review' } },
            ],
          },
        },
      },
    },
    {
      id: 'manual-review',
      name: 'Manual Review ($10)',
      description: 'A low-value order flagged for manual review',
      input: { order: { id: 'ORD-003', total_amount: 10, customer: 'Charlie' } },
      fixtures: {
        receive_order: { orderId: 'ORD-003', validated: true },
        route_order: 'Manual Review',
        flag_for_review: { flagged: true, reason: 'Low value order' },
        confirm_order: { confirmed: true, eta: 'Pending review' },
      },
      rulesData: {
        'rules/routing.rules.yaml': {
          data: {

            hit_policy: 'first',
            inputs: ['order.total_amount'],
            rules: [
              {
                when: { 'order.total_amount': { gte: 200 } },
                then: { classification: 'Express' },
              },
              {
                when: { 'order.total_amount': { gte: 50 } },
                then: { classification: 'Standard' },
              },
              { then: { classification: 'Manual Review' } },
            ],
          },
        },
      },
    },
  ],

  // ── Parallel Pipeline ────────────────────────────────
  parallel_pipeline: [
    {
      id: 'default-processing',
      name: 'Default Processing',
      description: 'Data flows through all three parallel branches and aggregates',
      input: { data: { records: [{ id: 1 }, { id: 2 }], source: 'api' } },
      fixtures: {
        receive_data: { parsed: true, recordCount: 2 },
        enrich_data: { enriched: true, externalRefs: 2 },
        validate_data: { valid: true, errors: 0 },
        transform_data: { transformed: true, format: 'canonical' },
        aggregate_results: { merged: true, totalRecords: 2 },
      },
    },
    {
      id: 'with-enrichment',
      name: 'With External Enrichment',
      description: 'Processing with rich external data augmentation',
      input: { data: { records: [{ id: 1, sku: 'ABC-123' }], source: 'warehouse' } },
      fixtures: {
        receive_data: { parsed: true, recordCount: 1 },
        enrich_data: { enriched: true, supplier: 'ACME Corp', price: 29.99 },
        validate_data: { valid: true, warnings: ['Missing category'] },
        transform_data: { transformed: true, format: 'warehouse-v2' },
        aggregate_results: { merged: true, totalRecords: 1, warnings: 1 },
      },
    },
  ],

  // ── CI/CD Pipeline ───────────────────────────────────
  ci_cd_pipeline: [
    {
      id: 'all-pass',
      name: 'All Checks Pass',
      description: 'Code is pushed, all tests pass, deployed to staging, approved, and released',
      input: { commit: { sha: 'abc1234', branch: 'main', author: 'Alice' } },
      fixtures: {
        push_code: { sha: 'abc1234', branch: 'main' },
        install_dependencies: { cached: true, packages: 142 },
        build_project: { success: true, duration: '45s', artifacts: 3 },
        run_unit_tests: { passed: 48, failed: 0, coverage: 94.2 },
        run_integration_tests: { passed: 12, failed: 0 },
        run_e2e_tests: { passed: 8, failed: 0 },
        quality_gate: 'All checks pass',
        deploy_staging: { url: 'https://staging.example.com', healthy: true },
        await_approval: { approver: 'Bob', approved: true },
        deploy_production: { url: 'https://example.com', strategy: 'blue-green' },
      },
    },
    {
      id: 'build-failure',
      name: 'Build Failure',
      description: 'Code is pushed but the build step fails, triggering the error handler',
      input: { commit: { sha: 'def5678', branch: 'feature/broken', author: 'Charlie' } },
      fixtures: {
        push_code: { sha: 'def5678', branch: 'feature/broken' },
        install_dependencies: { cached: false, packages: 142 },
        build_project: { _error: true, error: 'TypeScript compilation failed' },
      },
    },
    {
      id: 'checks-fail',
      name: 'Quality Checks Fail',
      description: 'Build succeeds but test failures cause the quality gate to reject the pipeline',
      input: { commit: { sha: 'ghi9012', branch: 'feature/flaky', author: 'Dave' } },
      fixtures: {
        push_code: { sha: 'ghi9012', branch: 'feature/flaky' },
        install_dependencies: { cached: true, packages: 142 },
        build_project: { success: true, duration: '50s' },
        run_unit_tests: { passed: 45, failed: 3, coverage: 88.1 },
        run_integration_tests: { passed: 10, failed: 2 },
        run_e2e_tests: { passed: 6, failed: 2 },
        quality_gate: 'Checks fail',
        reject_pipeline: { notified: true, failureCount: 7 },
      },
    },
  ],

  // ── Patient Intake ───────────────────────────────────
  patient_intake: [
    {
      id: 'existing-routine',
      name: 'Existing Patient, Routine Visit',
      description: 'An existing patient with full coverage arrives for a routine appointment',
      input: {
        patient: { id: 'PT-001', name: 'Alice Smith', dob: '1985-03-15' },
        visit: { type: 'routine', reason: 'Annual checkup' },
      },
      fixtures: {
        patient_arrives: { checkedIn: true, method: 'kiosk' },
        verify_identity: { verified: true, photoMatch: true },
        check_existing_record: 'Existing patient',
        update_demographics: { updated: true, changedFields: ['phone'] },
        collect_insurance_info: { memberId: 'INS-12345', group: 'GRP-100' },
        verify_insurance_coverage: 'Fully covered',
        triage_assessment: 'Routine',
        assign_provider: { provider: 'Dr. Johnson', specialty: 'General' },
        schedule_appointment: { slot: '10:30 AM', room: 'B-204' },
      },
      rulesData: {
        'rules/provider-assignment.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['visit.type'],
            rules: [
              {
                when: { 'visit.type': { eq: 'routine' } },
                then: { provider: 'Dr. Johnson', specialty: 'General' },
              },
              {
                when: { 'visit.type': { eq: 'urgent' } },
                then: { provider: 'Dr. Chen', specialty: 'Emergency' },
              },
            ],
          },
        },
        'rules/scheduling.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['visit.type'],
            rules: [
              {
                when: { 'visit.type': { eq: 'routine' } },
                then: { priority: 'normal', maxWait: '30min' },
              },
              {
                when: { 'visit.type': { eq: 'urgent' } },
                then: { priority: 'high', maxWait: '10min' },
              },
            ],
          },
        },
      },
    },
    {
      id: 'new-emergency',
      name: 'New Patient, Emergency',
      description: 'A new patient arrives with emergency symptoms and is escalated',
      input: {
        patient: { name: 'Bob Jones', dob: '1990-07-22' },
        visit: { type: 'emergency', reason: 'Chest pain' },
      },
      fixtures: {
        patient_arrives: { checkedIn: true, method: 'walk-in' },
        verify_identity: { verified: true, photoMatch: true },
        check_existing_record: 'New patient',
        create_patient_record: { patientId: 'PT-NEW-001', created: true },
        collect_insurance_info: { memberId: 'INS-67890', group: 'GRP-200' },
        verify_insurance_coverage: 'Fully covered',
        triage_assessment: 'Emergency',
        escalate_emergency: { transferred: true, department: 'ER', notified: 'Dr. Chen' },
      },
    },
    {
      id: 'partial-coverage-urgent',
      name: 'Partial Coverage, Urgent',
      description: 'An existing patient with partial insurance coverage needs urgent care',
      input: {
        patient: { id: 'PT-003', name: 'Carol Davis', dob: '1975-11-30' },
        visit: { type: 'urgent', reason: 'Severe migraine' },
      },
      fixtures: {
        patient_arrives: { checkedIn: true, method: 'front-desk' },
        verify_identity: { verified: true },
        check_existing_record: 'Existing patient',
        update_demographics: { updated: false, noChanges: true },
        collect_insurance_info: { memberId: 'INS-33333', group: 'GRP-150' },
        verify_insurance_coverage: 'Partial coverage',
        collect_copay: { amount: 50, method: 'card', processed: true },
        triage_assessment: 'Urgent',
        assign_provider: { provider: 'Dr. Chen', specialty: 'Emergency' },
        schedule_appointment: { slot: 'Next available', room: 'A-101', priority: 'high' },
      },
      rulesData: {
        'rules/provider-assignment.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['visit.type'],
            rules: [
              {
                when: { 'visit.type': { eq: 'routine' } },
                then: { provider: 'Dr. Johnson', specialty: 'General' },
              },
              {
                when: { 'visit.type': { eq: 'urgent' } },
                then: { provider: 'Dr. Chen', specialty: 'Emergency' },
              },
            ],
          },
        },
        'rules/scheduling.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['visit.type'],
            rules: [
              {
                when: { 'visit.type': { eq: 'routine' } },
                then: { priority: 'normal', maxWait: '30min' },
              },
              {
                when: { 'visit.type': { eq: 'urgent' } },
                then: { priority: 'high', maxWait: '10min' },
              },
            ],
          },
        },
      },
    },
  ],

  // ── Subscription Billing ─────────────────────────────
  subscription_billing: [
    {
      id: 'billing-success',
      name: 'Standard Billing Success',
      description: 'A Pro plan subscription is billed successfully with discount and tax',
      input: {
        account: { id: 'ACC-001', plan: 'Pro', tenure_months: 14 },
        billing: { period: 'monthly', region: 'US-CA' },
      },
      fixtures: {
        initiate_billing: { accountId: 'ACC-001', plan: 'Pro', cycle: 'March 2025' },
        generate_invoice: {
          invoiceId: 'INV-001',
          base: 49.99,
          discount: -5.0,
          tax: 3.82,
          total: 48.81,
        },
        process_payment: { charged: true, method: 'Visa *4242', transactionId: 'TXN-001' },
        check_payment_result: 'Payment Succeeded',
        send_receipt: { emailed: true, to: 'alice@example.com' },
      },
      rulesData: {
        'rules/pricing.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['account.plan'],
            rules: [
              {
                when: { 'account.plan': { eq: 'Pro' } },
                then: { base_price: 49.99, currency: 'USD' },
              },
              {
                when: { 'account.plan': { eq: 'Enterprise' } },
                then: { base_price: 199.99, currency: 'USD' },
              },
              { then: { base_price: 9.99, currency: 'USD' } },
            ],
          },
        },
        'rules/discount.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['account.tenure_months'],
            rules: [
              {
                when: { 'account.tenure_months': { gte: 12 } },
                then: { discount_pct: 10, reason: 'Loyalty discount' },
              },
              { then: { discount_pct: 0 } },
            ],
          },
        },
        'rules/tax.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['billing.region'],
            rules: [
              {
                when: { 'billing.region': { eq: 'US-CA' } },
                then: { tax_rate: 8.5, jurisdiction: 'California' },
              },
              {
                when: { 'billing.region': { eq: 'US-NY' } },
                then: { tax_rate: 8.875, jurisdiction: 'New York' },
              },
              { then: { tax_rate: 0, jurisdiction: 'Tax-exempt' } },
            ],
          },
        },
      },
    },
    {
      id: 'payment-declined',
      name: 'Payment Declined',
      description: 'Billing proceeds normally but the payment is declined, entering the dunning flow',
      input: {
        account: { id: 'ACC-002', plan: 'Pro', tenure_months: 3 },
        billing: { period: 'monthly', region: 'US-NY' },
      },
      fixtures: {
        initiate_billing: { accountId: 'ACC-002', plan: 'Pro', cycle: 'March 2025' },
        generate_invoice: { invoiceId: 'INV-002', base: 49.99, discount: 0, tax: 4.44, total: 54.43 },
        process_payment: { charged: false, error: 'Card declined' },
        check_payment_result: 'Payment Declined',
        notify_customer: { emailed: true, to: 'bob@example.com', dunningStep: 1 },
      },
      rulesData: {
        'rules/pricing.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['account.plan'],
            rules: [
              {
                when: { 'account.plan': { eq: 'Pro' } },
                then: { base_price: 49.99, currency: 'USD' },
              },
              { then: { base_price: 9.99, currency: 'USD' } },
            ],
          },
        },
        'rules/discount.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['account.tenure_months'],
            rules: [
              {
                when: { 'account.tenure_months': { gte: 12 } },
                then: { discount_pct: 10, reason: 'Loyalty discount' },
              },
              { then: { discount_pct: 0 } },
            ],
          },
        },
        'rules/tax.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['billing.region'],
            rules: [
              {
                when: { 'billing.region': { eq: 'US-NY' } },
                then: { tax_rate: 8.875, jurisdiction: 'New York' },
              },
              { then: { tax_rate: 0, jurisdiction: 'Tax-exempt' } },
            ],
          },
        },
      },
    },
  ],

  // ── E-Commerce Fulfillment ───────────────────────────
  e_commerce_fulfillment: [
    {
      id: 'in-stock-standard',
      name: 'In-Stock, Standard Shipping',
      description: 'Order placed, payment clears fraud check, in-stock items shipped via standard',
      input: {
        order: { id: 'ORD-E001', items: [{ sku: 'WIDGET-A', qty: 2 }], total: 59.98 },
        customer: { id: 'CUST-001', name: 'Alice', tier: 'Gold' },
      },
      fixtures: {
        receive_order: { orderId: 'ORD-E001', validated: true },
        validate_payment: { authorized: true, holdAmount: 59.98 },
        check_fraud: 'Approved',
        confirm_order: { confirmed: true, confirmationEmail: true },
        check_inventory: 'In stock',
        pick_and_pack: { packed: true, weight: '2.3 lbs', boxes: 1 },
        select_carrier: 'Standard shipping',
        ship_order: { tracking: 'TRK-123456', carrier: 'UPS Ground' },
        track_delivery: { delivered: true, signedBy: 'Alice' },
        capture_payment: { captured: true, amount: 59.98 },
        check_return_request: 'No return',
      },
      rulesData: {
        'rules/loyalty-rewards.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['customer.tier', 'order.total'],
            rules: [
              {
                when: { 'customer.tier': { eq: 'Gold' } },
                then: { points_multiplier: 2, bonus_points: 100 },
              },
              {
                when: { 'order.total': { gte: 100 } },
                then: { points_multiplier: 1.5, bonus_points: 50 },
              },
              { then: { points_multiplier: 1, bonus_points: 0 } },
            ],
          },
        },
      },
    },
    {
      id: 'fraud-flagged',
      name: 'Fraud Flagged for Review',
      description: 'Payment is flagged for manual fraud review, then cleared and fulfilled',
      input: {
        order: { id: 'ORD-E002', items: [{ sku: 'LAPTOP-X', qty: 1 }], total: 1299.99 },
        customer: { id: 'CUST-NEW', name: 'Unknown', tier: 'Basic' },
      },
      fixtures: {
        receive_order: { orderId: 'ORD-E002', validated: true },
        validate_payment: { authorized: true, holdAmount: 1299.99 },
        check_fraud: 'Flagged for review',
        manual_fraud_review: { cleared: true, analyst: 'Fraud Team', notes: 'Verified with customer' },
        confirm_order: { confirmed: true },
        check_inventory: 'In stock',
        pick_and_pack: { packed: true, weight: '5.1 lbs', boxes: 1 },
        select_carrier: 'Express shipping',
        ship_order: { tracking: 'TRK-789012', carrier: 'FedEx Express' },
        track_delivery: { delivered: true },
        capture_payment: { captured: true, amount: 1299.99 },
        check_return_request: 'No return',
      },
      rulesData: {
        'rules/loyalty-rewards.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['customer.tier'],
            rules: [
              { then: { points_multiplier: 1, bonus_points: 0 } },
            ],
          },
        },
      },
    },
    {
      id: 'return-requested',
      name: 'Return Requested',
      description: 'Order is delivered but customer requests a return and receives a refund',
      input: {
        order: { id: 'ORD-E003', items: [{ sku: 'SHOES-M', qty: 1 }], total: 89.99 },
        customer: { id: 'CUST-003', name: 'Carol', tier: 'Silver' },
      },
      fixtures: {
        receive_order: { orderId: 'ORD-E003', validated: true },
        validate_payment: { authorized: true, holdAmount: 89.99 },
        check_fraud: 'Approved',
        confirm_order: { confirmed: true },
        check_inventory: 'In stock',
        pick_and_pack: { packed: true, weight: '1.8 lbs' },
        select_carrier: 'Standard shipping',
        ship_order: { tracking: 'TRK-345678', carrier: 'USPS' },
        track_delivery: { delivered: true },
        capture_payment: { captured: true, amount: 89.99 },
        check_return_request: 'Return requested',
        process_return: { received: true, condition: 'Like new', restocked: true },
        issue_refund: { refunded: true, amount: 89.99, method: 'Original payment' },
      },
      rulesData: {
        'rules/loyalty-rewards.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['customer.tier'],
            rules: [
              {
                when: { 'customer.tier': { eq: 'Silver' } },
                then: { points_multiplier: 1.5, bonus_points: 25 },
              },
              { then: { points_multiplier: 1, bonus_points: 0 } },
            ],
          },
        },
      },
    },
  ],

  // ── Insurance Claims ─────────────────────────────────
  insurance_claims: [
    {
      id: 'auto-approved',
      name: 'Auto-Approved Claim',
      description: 'A simple auto claim is filed, auto-approved, and settled with payment',
      input: {
        claim: { type: 'auto', amount: 3500, incident: 'Fender bender', date: '2025-02-15' },
        claimant: { id: 'CLT-001', name: 'Alice', policyNumber: 'POL-A100' },
      },
      fixtures: {
        file_claim: { claimNumber: 'CLM-001', filed: true },
        acknowledge_claim: { acknowledged: true, assignedTo: 'Agent Smith' },
        classify_claim: 'Auto',
        check_auto_adjudication: 'Auto-approve',
        evaluate_claim: { assessed: true, liability: 'clear', damageEstimate: 3500 },
        check_escalation: 'Standard processing',
        present_offer: { amount: 3200, breakdown: { repair: 2800, rental: 400 } },
        await_claimant_response: { response: 'accept' },
        check_claimant_decision: 'Accepted',
        process_payment: { paid: true, amount: 3200, method: 'direct deposit' },
      },
      rulesData: {
        'rules/escalation.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['claim.amount'],
            rules: [
              {
                when: { 'claim.amount': { gte: 50000 } },
                then: { level: 'senior', reason: 'High value claim' },
              },
              { then: { level: 'standard' } },
            ],
          },
        },
        'rules/reserve-setting.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['claim.type', 'claim.amount'],
            rules: [
              {
                when: { 'claim.type': { eq: 'auto' } },
                then: { reserve: 5000, category: 'auto-collision' },
              },
              { then: { reserve: 10000, category: 'general' } },
            ],
          },
        },
        'rules/settlement-calculation.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['claim.amount'],
            rules: [
              {
                when: { 'claim.amount': { lte: 10000 } },
                then: { deductible: 500, settlement_pct: 90 },
              },
              { then: { deductible: 1000, settlement_pct: 85 } },
            ],
          },
        },
      },
    },
    {
      id: 'fraud-investigation',
      name: 'Fraud Investigation',
      description: 'A suspicious health claim triggers fraud detection and SIU investigation',
      input: {
        claim: { type: 'health', amount: 25000, incident: 'Surgery claim', date: '2025-01-20' },
        claimant: { id: 'CLT-002', name: 'Bob', policyNumber: 'POL-H200' },
      },
      fixtures: {
        file_claim: { claimNumber: 'CLM-002', filed: true },
        acknowledge_claim: { acknowledged: true },
        classify_claim: 'Health',
        check_auto_adjudication: 'Requires review',
        run_fraud_detection: 'Suspicious',
        escalate_to_siu: { referralId: 'SIU-001', priority: 'high' },
        await_investigation: { result: 'cleared', investigator: 'Agent Martinez', weeks: 3 },
        check_investigation_result: 'Cleared',
        evaluate_claim: { assessed: true, liability: 'valid', medicalReview: true },
        check_escalation: 'Standard processing',
        present_offer: { amount: 22000 },
        await_claimant_response: { response: 'accept' },
        check_claimant_decision: 'Accepted',
        process_payment: { paid: true, amount: 22000 },
      },
      rulesData: {
        'rules/escalation.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['claim.amount'],
            rules: [
              { then: { level: 'standard' } },
            ],
          },
        },
        'rules/reserve-setting.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['claim.type'],
            rules: [
              {
                when: { 'claim.type': { eq: 'health' } },
                then: { reserve: 30000, category: 'health-surgical' },
              },
              { then: { reserve: 10000, category: 'general' } },
            ],
          },
        },
        'rules/settlement-calculation.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['claim.amount'],
            rules: [
              {
                when: { 'claim.amount': { gte: 10000 } },
                then: { deductible: 1000, settlement_pct: 85 },
              },
              { then: { deductible: 500, settlement_pct: 90 } },
            ],
          },
        },
      },
    },
    {
      id: 'senior-review',
      name: 'Senior Review with Acceptance',
      description:
        'A high-value property claim escalated to senior adjuster, settled and accepted',
      input: {
        claim: { type: 'property', amount: 75000, incident: 'Storm damage', date: '2025-03-01' },
        claimant: { id: 'CLT-003', name: 'Carol', policyNumber: 'POL-P300' },
      },
      fixtures: {
        file_claim: { claimNumber: 'CLM-003', filed: true },
        acknowledge_claim: { acknowledged: true },
        classify_claim: 'Property',
        check_auto_adjudication: 'Requires review',
        run_fraud_detection: 'Clear',
        evaluate_claim: { assessed: true, damageEstimate: 68000, liability: 'covered' },
        check_escalation: 'Escalate to senior',
        senior_adjuster_review: { reviewed: true, recommendation: 65000 },
        calculate_settlement: { amount: 62000 },
        present_offer: { amount: 62000 },
        await_claimant_response: { response: 'accept' },
        check_claimant_decision: 'Accepted',
        process_payment: { paid: true, amount: 62000, method: 'direct deposit' },
      },
      rulesData: {
        'rules/escalation.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['claim.amount'],
            rules: [
              {
                when: { 'claim.amount': { gte: 50000 } },
                then: { level: 'senior', reason: 'High value claim' },
              },
              { then: { level: 'standard' } },
            ],
          },
        },
        'rules/reserve-setting.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['claim.type'],
            rules: [
              {
                when: { 'claim.type': { eq: 'property' } },
                then: { reserve: 100000, category: 'property-damage' },
              },
              { then: { reserve: 10000, category: 'general' } },
            ],
          },
        },
        'rules/settlement-calculation.rules.yaml': {
          data: {
            hit_policy: 'first',
            inputs: ['claim.amount'],
            rules: [
              {
                when: { 'claim.amount': { gte: 50000 } },
                then: { deductible: 2500, settlement_pct: 80 },
              },
              { then: { deductible: 500, settlement_pct: 90 } },
            ],
          },
        },
      },
    },
  ],
}

export function getScenarios(docName: string): TemplateScenario[] {
  return TEMPLATE_SCENARIOS[docName] ?? []
}
