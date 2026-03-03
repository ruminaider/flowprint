import { parse } from 'yaml'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

export type TemplateComplexity = 'beginner' | 'intermediate' | 'advanced' | 'showcase'

export interface TemplateInfo {
  id: string
  name: string
  description: string
  complexity: TemplateComplexity
  nodeCount: number
  laneCount: number
}

/** Node: [col, lane, type] where type: a=action, s=switch, p=parallel, w=wait, e=error, t=terminal */
export interface TemplateTopo {
  lanes: number
  nodes: [number, number, string][]
  edges: [number, number][]
}

// ── Embedded YAML strings ──────────────────────────────

const YAML_HELLO_WORLD = `schema: flowprint/1.0
name: hello_world
version: 1.0.0
description: Simplest possible blueprint demonstrating a single action followed by a terminal node
lanes:
  frontstage:
    label: Frontstage
    visibility: external
    order: 0
  backstage:
    label: Backstage
    visibility: internal
    order: 1
nodes:
  greet_user:
    type: action
    lane: frontstage
    label: Greet User
    description: Accept an incoming request and respond with a greeting
    next: done
  done:
    type: terminal
    lane: backstage
    label: Complete
    outcome: success`

const YAML_REQUEST_RESPONSE = `schema: flowprint/1.0
name: request_response
version: 1.0.0
description: Basic request/response pattern with receive, process, and respond phases
lanes:
  api_gateway:
    label: API Gateway
    visibility: external
    order: 0
  backend:
    label: Backend Service
    visibility: internal
    order: 1
nodes:
  receive_request:
    type: action
    lane: api_gateway
    label: Receive Request
    description: Accept and validate the incoming API request
    next: process_request
  process_request:
    type: action
    lane: backend
    label: Process Request
    description: Execute the core business logic for the request
    next: send_response
  send_response:
    type: action
    lane: api_gateway
    label: Send Response
    description: Format and return the response to the caller
    next: done
  done:
    type: terminal
    lane: api_gateway
    label: Complete
    outcome: success`

const YAML_APPROVAL_WORKFLOW = `schema: flowprint/1.0
name: approval_workflow
version: 1.0.0
description: Approval workflow with submit, review, and conditional routing based on approval decision
lanes:
  requester:
    label: Requester
    visibility: external
    order: 0
  reviewer:
    label: Reviewer
    visibility: external
    order: 1
  system:
    label: System
    visibility: internal
    order: 2
nodes:
  submit_request:
    type: action
    lane: requester
    label: Submit Request
    description: Requester submits a new approval request with supporting details
    next: review_request
  review_request:
    type: action
    lane: reviewer
    label: Review Request
    description: Reviewer examines the request and records an approval decision
    next: check_approval
  check_approval:
    type: switch
    lane: reviewer
    label: Check Approval Decision
    description: Route based on the reviewer's decision
    cases:
      - when: Approved
        next: process_approval
      - when: Rejected
        next: notify_rejection
  process_approval:
    type: action
    lane: system
    label: Process Approval
    description: Execute the approved action and update downstream systems
    next: done
  notify_rejection:
    type: action
    lane: system
    label: Notify Rejection
    description: Send rejection notification to the requester with reviewer comments
    next: done
  done:
    type: terminal
    lane: system
    label: Complete
    outcome: success`

const YAML_ORDER_ROUTING = `schema: flowprint/1.0
name: order_routing
version: 1.0.0
description: Order routing workflow that classifies incoming orders by amount and routes them to the appropriate fulfillment path
lanes:
  intake:
    label: Order Intake
    visibility: external
    order: 0
  routing:
    label: Routing
    visibility: internal
    order: 1
  fulfillment:
    label: Fulfillment
    visibility: internal
    order: 2
nodes:
  receive_order:
    type: action
    lane: intake
    label: Receive Order
    description: Accept and validate the incoming order payload
    next: classify_order
  classify_order:
    type: action
    lane: routing
    label: Classify Order
    description: Evaluate order attributes against routing rules to determine the fulfillment path
    rules:
      file: rules/routing.rules.yaml
    next: route_order
  route_order:
    type: switch
    lane: routing
    label: Route Order
    description: Direct the order to the appropriate fulfillment handler based on classification
    cases:
      - when: Express
        next: fulfill_express
      - when: Standard
        next: fulfill_standard
      - when: Manual Review
        next: flag_for_review
  fulfill_express:
    type: action
    lane: fulfillment
    label: Fulfill Express
    description: Process high-priority orders through the expedited fulfillment pipeline
    next: confirm_order
  fulfill_standard:
    type: action
    lane: fulfillment
    label: Fulfill Standard
    description: Process orders through the standard fulfillment pipeline
    next: confirm_order
  flag_for_review:
    type: action
    lane: fulfillment
    label: Flag for Review
    description: Queue the order for manual review due to unusual attributes or high value
    next: confirm_order
  confirm_order:
    type: action
    lane: intake
    label: Confirm Order
    description: Send order confirmation to the customer with fulfillment details
    next: done
  done:
    type: terminal
    lane: intake
    label: Complete
    outcome: success`

const YAML_PARALLEL_PIPELINE = `schema: flowprint/1.0
name: parallel_pipeline
version: 1.0.0
description: Parallel processing pipeline that fans out to three concurrent branches and aggregates results
lanes:
  orchestration:
    label: Orchestration
    visibility: external
    order: 0
  processing:
    label: Processing
    visibility: internal
    order: 1
nodes:
  receive_data:
    type: action
    lane: orchestration
    label: Receive Data
    description: Accept incoming data payload and prepare it for parallel processing
    next: fan_out
  fan_out:
    type: parallel
    lane: orchestration
    label: Fan Out
    description: Split the workload into three concurrent processing branches
    branches:
      - enrich_data
      - validate_data
      - transform_data
    join: aggregate_results
  enrich_data:
    type: action
    lane: processing
    label: Enrich Data
    description: Augment input data with external reference information
    next: aggregate_results
  validate_data:
    type: action
    lane: processing
    label: Validate Data
    description: Run validation rules and flag any data quality issues
    next: aggregate_results
  transform_data:
    type: action
    lane: processing
    label: Transform Data
    description: Normalize and reshape data into the target format
    next: aggregate_results
  aggregate_results:
    type: action
    lane: orchestration
    label: Aggregate Results
    description: Combine outputs from all branches into a single unified result
    next: done
  done:
    type: terminal
    lane: orchestration
    label: Complete
    outcome: success`

const YAML_CI_CD_PIPELINE = `schema: flowprint/1.0
name: ci_cd_pipeline
version: 1.0.0
description: CI/CD pipeline with parallel test stages, quality gate decision, and multi-environment deployment. Covers code push through production release across developer, CI system, and deployment lanes.
metadata:
  owner: platform-engineering
  domain: devops
lanes:
  developer:
    label: Developer
    visibility: external
    order: 0
  ci_system:
    label: CI System
    visibility: internal
    order: 1
  deployment:
    label: Deployment
    visibility: internal
    order: 2
nodes:
  push_code:
    type: action
    lane: developer
    label: Push Code
    description: Developer pushes commit or opens pull request triggering the pipeline
    next: install_dependencies
  install_dependencies:
    type: action
    lane: ci_system
    label: Install Dependencies
    description: Install project dependencies and cache node_modules for subsequent steps
    next: build_project
  build_project:
    type: action
    lane: ci_system
    label: Build Project
    description: Compile TypeScript, bundle assets, and generate build artifacts
    next: run_tests
    error:
      catch: handle_build_failure
  run_tests:
    type: parallel
    lane: ci_system
    label: Run Tests
    description: Execute all test suites concurrently to minimize pipeline duration
    branches:
      - run_unit_tests
      - run_integration_tests
      - run_e2e_tests
    join: quality_gate
  run_unit_tests:
    type: action
    lane: ci_system
    label: Run Unit Tests
    description: Execute unit test suite with coverage collection
    next: quality_gate
  run_integration_tests:
    type: action
    lane: ci_system
    label: Run Integration Tests
    description: Run integration tests against test database and mock services
    next: quality_gate
  run_e2e_tests:
    type: action
    lane: ci_system
    label: Run E2E Tests
    description: Run Playwright end-to-end tests against preview deployment
    next: quality_gate
  quality_gate:
    type: switch
    lane: ci_system
    label: Quality Gate
    description: Evaluate test results, coverage, and lint status against thresholds
    cases:
      - when: All checks pass
        next: deploy_staging
      - when: Checks fail
        next: reject_pipeline
  reject_pipeline:
    type: action
    lane: ci_system
    label: Reject Pipeline
    description: Post failure summary to pull request and notify author
    next: pipeline_failed
  deploy_staging:
    type: action
    lane: deployment
    label: Deploy to Staging
    description: Deploy build artifacts to staging environment and run smoke tests
    next: await_approval
    error:
      catch: handle_deploy_failure
  await_approval:
    type: wait
    lane: developer
    label: Await Production Approval
    description: Wait for team lead or release manager to approve production deployment
    event: await_approval_signal
    next: deploy_production
  deploy_production:
    type: action
    lane: deployment
    label: Deploy to Production
    description: Roll out to production using blue-green deployment strategy
    next: pipeline_complete
    error:
      catch: handle_deploy_failure
  handle_build_failure:
    type: error
    lane: ci_system
    label: Handle Build Failure
    description: Capture build logs, notify developer, and mark pipeline as failed
    next: pipeline_failed
  handle_deploy_failure:
    type: error
    lane: deployment
    label: Handle Deploy Failure
    description: Rollback deployment, capture logs, and alert on-call engineer
    next: pipeline_failed
  pipeline_complete:
    type: terminal
    lane: deployment
    label: Pipeline Complete
    outcome: success
  pipeline_failed:
    type: terminal
    lane: ci_system
    label: Pipeline Failed
    outcome: failure`

const YAML_PATIENT_INTAKE = `schema: flowprint/1.0
name: patient_intake
version: 1.0.0
description: Healthcare patient intake workflow covering arrival, registration, insurance verification, clinical triage, provider assignment, and appointment scheduling across patient, reception, clinical, and insurance lanes.
metadata:
  owner: clinical-ops
  domain: healthcare
lanes:
  patient:
    label: Patient
    visibility: external
    order: 0
  reception:
    label: Reception
    visibility: external
    order: 1
  clinical:
    label: Clinical
    visibility: internal
    order: 2
  insurance:
    label: Insurance
    visibility: internal
    order: 3
nodes:
  patient_arrives:
    type: action
    lane: patient
    label: Patient Arrives
    description: Patient checks in at the front desk or via self-service kiosk
    next: verify_identity
  verify_identity:
    type: action
    lane: reception
    label: Verify Identity
    description: Confirm patient identity using photo ID and date of birth
    next: check_existing_record
  check_existing_record:
    type: switch
    lane: reception
    label: Check Existing Record
    description: Determine if the patient has an existing record in the system
    cases:
      - when: Existing patient
        next: update_demographics
      - when: New patient
        next: create_patient_record
  create_patient_record:
    type: action
    lane: reception
    label: Create Patient Record
    description: Register new patient with demographics, contact info, and emergency contacts
    next: collect_insurance_info
  update_demographics:
    type: action
    lane: reception
    label: Update Demographics
    description: Confirm and update address, phone, and emergency contact on file
    next: collect_insurance_info
  collect_insurance_info:
    type: action
    lane: reception
    label: Collect Insurance Info
    description: Capture insurance card details, member ID, and group number
    next: verify_insurance_coverage
  verify_insurance_coverage:
    type: switch
    lane: insurance
    label: Verify Insurance Coverage
    description: Check active coverage, co-pay amounts, and referral requirements
    cases:
      - when: Fully covered
        next: triage_assessment
      - when: Partial coverage
        next: collect_copay
      - when: No coverage
        next: discuss_self_pay
  collect_copay:
    type: action
    lane: reception
    label: Collect Co-pay
    description: Process co-pay or co-insurance payment at the front desk
    next: triage_assessment
  discuss_self_pay:
    type: action
    lane: reception
    label: Discuss Self-Pay Options
    description: Present self-pay rates, payment plans, and financial assistance programs
    next: triage_assessment
  triage_assessment:
    type: switch
    lane: clinical
    label: Triage Assessment
    description: Nurse evaluates vitals, chief complaint, and symptom severity
    cases:
      - when: Emergency
        next: escalate_emergency
      - when: Urgent
        next: assign_provider
      - when: Routine
        next: assign_provider
  escalate_emergency:
    type: action
    lane: clinical
    label: Escalate to Emergency
    description: Transfer patient to emergency department and notify on-call physician
    next: intake_failed
  assign_provider:
    type: action
    lane: clinical
    label: Assign Provider
    description: Match patient to available provider based on specialty and availability
    rules:
      file: rules/provider-assignment.rules.yaml
    next: schedule_appointment
  schedule_appointment:
    type: action
    lane: reception
    label: Schedule Appointment
    description: Book appointment slot based on urgency, provider availability, and patient preference
    rules:
      file: rules/scheduling.rules.yaml
    next: intake_complete
  intake_complete:
    type: terminal
    lane: patient
    label: Intake Complete
    outcome: success
  intake_failed:
    type: terminal
    lane: patient
    label: Intake Failed
    outcome: failure`

const YAML_SUBSCRIPTION_BILLING = `schema: flowprint/1.0
name: subscription_billing
version: 1.0.0
description: Subscription billing workflow that resolves pricing tiers, applies discounts, calculates tax, processes payment, and handles failures with retry and dunning
lanes:
  customer:
    label: Customer
    visibility: external
    order: 0
  billing:
    label: Billing Engine
    visibility: internal
    order: 1
  finance:
    label: Finance & Compliance
    visibility: internal
    order: 2
nodes:
  initiate_billing:
    type: action
    lane: customer
    label: Initiate Billing Cycle
    description: Triggered by the subscription renewal schedule; loads account and plan details
    next: resolve_pricing
  resolve_pricing:
    type: action
    lane: billing
    label: Resolve Pricing
    description: Determine the base price for the subscription tier and billing period
    rules:
      file: rules/pricing.rules.yaml
    next: apply_discounts
  apply_discounts:
    type: action
    lane: billing
    label: Apply Discounts
    description: Evaluate and apply any eligible discounts based on tenure, promotions, or bundling
    rules:
      file: rules/discount.rules.yaml
    next: calculate_tax
  calculate_tax:
    type: action
    lane: finance
    label: Calculate Tax
    description: Compute applicable sales tax based on customer jurisdiction and product category
    rules:
      file: rules/tax.rules.yaml
    next: generate_invoice
  generate_invoice:
    type: action
    lane: billing
    label: Generate Invoice
    description: Create an itemized invoice with base price, discounts, tax, and total
    next: process_payment
  process_payment:
    type: action
    lane: billing
    label: Process Payment
    description: Charge the customer's payment method on file
    next: check_payment_result
    error:
      catch: handle_payment_failure
  check_payment_result:
    type: switch
    lane: billing
    label: Check Payment Result
    description: Route based on the payment processing outcome
    cases:
      - when: Payment Succeeded
        next: send_receipt
      - when: Payment Declined
        next: handle_payment_failure
  send_receipt:
    type: action
    lane: customer
    label: Send Receipt
    description: Email the customer a payment receipt and updated subscription confirmation
    next: billing_complete
  handle_payment_failure:
    type: error
    lane: billing
    label: Handle Payment Failure
    description: Log the failure, schedule a retry, and enter the dunning workflow if retries are exhausted
    next: notify_customer
  notify_customer:
    type: action
    lane: customer
    label: Notify Customer
    description: Alert the customer about the billing issue and provide payment update instructions
    next: billing_incomplete
  billing_complete:
    type: terminal
    lane: customer
    label: Billing Complete
    outcome: success
  billing_incomplete:
    type: terminal
    lane: customer
    label: Billing Incomplete
    outcome: failure`

const YAML_E_COMMERCE_FULFILLMENT = `schema: flowprint/1.0
name: e_commerce_fulfillment
version: 1.0.0
description: Full e-commerce order fulfillment covering payment, fraud detection, inventory allocation, pick-and-pack, shipping, delivery tracking, return handling, and loyalty rewards across customer, sales, warehouse, shipping, and finance lanes.
metadata:
  owner: commerce-platform
  domain: e-commerce
lanes:
  customer:
    label: Customer
    visibility: external
    order: 0
  sales:
    label: Sales
    visibility: external
    order: 1
  warehouse:
    label: Warehouse
    visibility: internal
    order: 2
  shipping:
    label: Shipping
    visibility: internal
    order: 3
  finance:
    label: Finance
    visibility: internal
    order: 4
nodes:
  receive_order:
    type: action
    lane: customer
    label: Receive Order
    description: Customer places order through storefront or mobile app
    next: validate_payment
  validate_payment:
    type: action
    lane: finance
    label: Validate Payment
    description: Authorize payment method and place hold on funds
    next: check_fraud
    error:
      catch: handle_payment_error
  check_fraud:
    type: switch
    lane: finance
    label: Check Fraud
    description: Run fraud detection rules against order and payment details
    cases:
      - when: Approved
        next: confirm_order
      - when: Flagged for review
        next: manual_fraud_review
      - when: Rejected
        next: reject_order
  manual_fraud_review:
    type: wait
    lane: finance
    label: Manual Fraud Review
    description: Hold order for manual review by fraud analyst
    event: manual_fraud_review_signal
    next: confirm_order
  reject_order:
    type: action
    lane: sales
    label: Reject Order
    description: Cancel order, release payment hold, and notify customer
    next: order_cancelled
  confirm_order:
    type: action
    lane: sales
    label: Confirm Order
    description: Send order confirmation email and create fulfillment record
    next: check_inventory
  check_inventory:
    type: switch
    lane: warehouse
    label: Check Inventory
    description: Verify item availability and select fulfillment warehouse
    cases:
      - when: In stock
        next: pick_and_pack
      - when: Out of stock
        next: backorder_items
      - when: Partial stock
        next: split_shipment
  backorder_items:
    type: wait
    lane: warehouse
    label: Backorder Items
    description: Place items on backorder and wait for restocking
    event: backorder_items_signal
    next: pick_and_pack
  split_shipment:
    type: parallel
    lane: warehouse
    label: Split Shipment
    description: Split order into available and backordered shipments
    branches:
      - pick_and_pack
      - backorder_items
    join: select_carrier
  pick_and_pack:
    type: action
    lane: warehouse
    label: Pick and Pack
    description: Pick items from shelves, verify quantities, and pack for shipment
    next: select_carrier
  select_carrier:
    type: switch
    lane: shipping
    label: Select Carrier
    description: Choose shipping carrier based on weight, destination, and service level
    cases:
      - when: Standard shipping
        next: ship_order
      - when: Express shipping
        next: ship_order
      - when: Freight
        next: ship_order
  ship_order:
    type: action
    lane: shipping
    label: Ship Order
    description: Generate shipping label, hand off to carrier, and record tracking number
    next: track_delivery
  track_delivery:
    type: wait
    lane: shipping
    label: Track Delivery
    description: Monitor shipment status and await delivery confirmation
    event: track_delivery_signal
    next: capture_payment
  capture_payment:
    type: action
    lane: finance
    label: Capture Payment
    description: Capture authorized payment and generate invoice
    next: award_loyalty_points
  award_loyalty_points:
    type: action
    lane: finance
    label: Award Loyalty Points
    description: Calculate and credit loyalty points based on order total and membership tier
    rules:
      file: rules/loyalty-rewards.rules.yaml
    next: check_return_request
  check_return_request:
    type: switch
    lane: customer
    label: Check Return Request
    description: Determine if customer initiates a return within the eligibility window
    cases:
      - when: Return requested
        next: process_return
      - when: No return
        next: order_complete
  process_return:
    type: action
    lane: warehouse
    label: Process Return
    description: Receive returned items, inspect condition, and restock or dispose
    next: issue_refund
  issue_refund:
    type: action
    lane: finance
    label: Issue Refund
    description: Process refund to original payment method and adjust loyalty points
    next: order_complete
  handle_payment_error:
    type: error
    lane: finance
    label: Handle Payment Error
    description: Notify customer of payment failure and request alternate payment method
    next: order_cancelled
  order_complete:
    type: terminal
    lane: customer
    label: Order Complete
    outcome: success
  order_cancelled:
    type: terminal
    lane: customer
    label: Order Cancelled
    outcome: failure`

const YAML_INSURANCE_CLAIMS = `schema: flowprint/1.0
name: insurance_claims
version: 1.0.0
description: Insurance claims processing covering claim filing, classification, auto-adjudication, fraud detection, investigation, reserve setting, settlement calculation, payment, and appeals across claimant, agent, adjuster, legal, and finance lanes.
metadata:
  owner: claims-department
  domain: insurance
lanes:
  claimant:
    label: Claimant
    visibility: external
    order: 0
  agent:
    label: Agent
    visibility: external
    order: 1
  adjuster:
    label: Adjuster
    visibility: internal
    order: 2
  legal:
    label: Legal
    visibility: internal
    order: 3
  finance:
    label: Finance
    visibility: internal
    order: 4
nodes:
  file_claim:
    type: action
    lane: claimant
    label: File Claim
    description: Claimant submits claim with incident details, photos, and supporting documents
    next: acknowledge_claim
  acknowledge_claim:
    type: action
    lane: agent
    label: Acknowledge Claim
    description: Assign claim number, send confirmation to claimant, and record filing date
    next: classify_claim
  classify_claim:
    type: switch
    lane: agent
    label: Classify Claim
    description: Categorize claim by type to determine processing path and required expertise
    cases:
      - when: Auto
        next: check_auto_adjudication
      - when: Health
        next: check_auto_adjudication
      - when: Property
        next: check_auto_adjudication
      - when: Liability
        next: assign_adjuster
  check_auto_adjudication:
    type: switch
    lane: agent
    label: Check Auto-Adjudication
    description: Determine if claim qualifies for automatic approval without manual review
    cases:
      - when: Auto-approve
        next: set_reserves
      - when: Requires review
        next: run_fraud_detection
  run_fraud_detection:
    type: switch
    lane: adjuster
    label: Run Fraud Detection
    description: Screen claim against fraud detection patterns and scoring model
    cases:
      - when: Clear
        next: assign_adjuster
      - when: Suspicious
        next: escalate_to_siu
  escalate_to_siu:
    type: action
    lane: adjuster
    label: Escalate to SIU
    description: Refer claim to Special Investigations Unit for detailed fraud investigation
    next: await_investigation
  await_investigation:
    type: wait
    lane: adjuster
    label: Await Investigation
    description: Hold claim pending SIU investigation results and recommendation
    event: await_investigation_signal
    next: check_investigation_result
  check_investigation_result:
    type: switch
    lane: adjuster
    label: Check Investigation Result
    description: Evaluate SIU findings and determine next steps
    cases:
      - when: Fraud confirmed
        next: deny_claim
      - when: Cleared
        next: assign_adjuster
      - when: Inconclusive
        next: escalate_to_legal
  assign_adjuster:
    type: action
    lane: adjuster
    label: Assign Adjuster
    description: Assign qualified adjuster based on claim type, complexity, and workload
    rules:
      file: rules/escalation.rules.yaml
    next: set_reserves
  set_reserves:
    type: action
    lane: finance
    label: Set Reserves
    description: Establish financial reserves based on estimated claim value and type
    rules:
      file: rules/reserve-setting.rules.yaml
    next: evaluate_claim
  evaluate_claim:
    type: action
    lane: adjuster
    label: Evaluate Claim
    description: Review documentation, inspect damage, interview witnesses, and assess liability
    next: check_escalation
  check_escalation:
    type: switch
    lane: adjuster
    label: Check Escalation
    description: Determine if claim requires escalation to senior adjuster or legal review
    cases:
      - when: Standard processing
        next: calculate_settlement
      - when: Escalate to senior
        next: senior_adjuster_review
      - when: Escalate to legal
        next: escalate_to_legal
  senior_adjuster_review:
    type: action
    lane: adjuster
    label: Senior Adjuster Review
    description: Senior adjuster reviews complex claim and provides settlement recommendation
    next: calculate_settlement
  escalate_to_legal:
    type: action
    lane: legal
    label: Escalate to Legal
    description: Legal team reviews claim for litigation risk and regulatory compliance
    next: calculate_settlement
  calculate_settlement:
    type: action
    lane: adjuster
    label: Calculate Settlement
    description: Compute settlement amount based on policy limits, deductibles, and assessed damages
    rules:
      file: rules/settlement-calculation.rules.yaml
    next: present_offer
  present_offer:
    type: action
    lane: agent
    label: Present Settlement Offer
    description: Communicate settlement offer to claimant with itemized breakdown
    next: await_claimant_response
  await_claimant_response:
    type: wait
    lane: claimant
    label: Await Claimant Response
    description: Wait for claimant to accept, negotiate, or reject the settlement offer
    event: await_claimant_response_signal
    next: check_claimant_decision
  check_claimant_decision:
    type: switch
    lane: agent
    label: Check Claimant Decision
    description: Route based on claimant response to settlement offer
    cases:
      - when: Accepted
        next: process_payment
      - when: Rejected
        next: handle_appeal
      - when: Counter-offer
        next: evaluate_claim
  process_payment:
    type: action
    lane: finance
    label: Process Payment
    description: Issue settlement payment via check or direct deposit and close reserves
    next: claim_complete
  handle_appeal:
    type: action
    lane: legal
    label: Handle Appeal
    description: Review appeal, assess litigation risk, and determine if revised offer is warranted
    next: check_appeal_outcome
  check_appeal_outcome:
    type: switch
    lane: legal
    label: Check Appeal Outcome
    description: Determine resolution path for the appeal
    cases:
      - when: Revised offer
        next: present_offer
      - when: Uphold denial
        next: deny_claim
  deny_claim:
    type: action
    lane: agent
    label: Deny Claim
    description: Issue formal denial letter with explanation and appeal rights notice
    next: claim_denied
  claim_complete:
    type: terminal
    lane: claimant
    label: Claim Complete
    outcome: success
  claim_denied:
    type: terminal
    lane: claimant
    label: Claim Denied
    outcome: failure`

// ── Template registry ──────────────────────────────

interface TemplateEntry {
  info: TemplateInfo
  yaml: string
  topo: TemplateTopo
}

const TEMPLATES: TemplateEntry[] = [
  {
    info: {
      id: 'hello-world',
      name: 'Hello World',
      description: 'A minimal two-step blueprint to get started. Single lane, one action, one terminal.',
      complexity: 'beginner',
      nodeCount: 2,
      laneCount: 2,
    },
    yaml: YAML_HELLO_WORLD,
    topo: {
      lanes: 2,
      nodes: [[0, 0, 'a'], [1, 1, 't']],
      edges: [[0, 1]],
    },
  },
  {
    info: {
      id: 'request-response',
      name: 'Request / Response',
      description: 'A simple client-server exchange across two lanes with an error path.',
      complexity: 'beginner',
      nodeCount: 4,
      laneCount: 2,
    },
    yaml: YAML_REQUEST_RESPONSE,
    topo: {
      lanes: 2,
      nodes: [[0, 0, 'a'], [1, 1, 'a'], [2, 0, 'a'], [3, 0, 't']],
      edges: [[0, 1], [1, 2], [2, 3]],
    },
  },
  {
    info: {
      id: 'approval-workflow',
      name: 'Approval Workflow',
      description: 'Route requests through a human-in-the-loop approval step with approve/reject branches.',
      complexity: 'intermediate',
      nodeCount: 6,
      laneCount: 3,
    },
    yaml: YAML_APPROVAL_WORKFLOW,
    topo: {
      lanes: 3,
      nodes: [[0, 0, 'a'], [1, 1, 'a'], [2, 1, 's'], [3, 2, 'a'], [3, 2, 'a'], [4, 2, 't']],
      edges: [[0, 1], [1, 2], [2, 3], [2, 4], [3, 5], [4, 5]],
    },
  },
  {
    info: {
      id: 'order-routing',
      name: 'Order Routing',
      description: 'Fan out an incoming order to warehouse, payment, and notification lanes in parallel.',
      complexity: 'intermediate',
      nodeCount: 8,
      laneCount: 3,
    },
    yaml: YAML_ORDER_ROUTING,
    topo: {
      lanes: 3,
      nodes: [[0, 0, 'a'], [1, 1, 'a'], [2, 1, 's'], [3, 2, 'a'], [3, 2, 'a'], [3, 2, 'a'], [4, 0, 'a'], [5, 0, 't']],
      edges: [[0, 1], [1, 2], [2, 3], [2, 4], [2, 5], [3, 6], [4, 6], [5, 6], [6, 7]],
    },
  },
  {
    info: {
      id: 'parallel-pipeline',
      name: 'Parallel Pipeline',
      description: 'Fork multiple independent processing tracks and merge results before a final action.',
      complexity: 'intermediate',
      nodeCount: 7,
      laneCount: 2,
    },
    yaml: YAML_PARALLEL_PIPELINE,
    topo: {
      lanes: 2,
      nodes: [[0, 0, 'a'], [1, 0, 'p'], [2, 1, 'a'], [2, 1, 'a'], [2, 1, 'a'], [3, 0, 'a'], [4, 0, 't']],
      edges: [[0, 1], [1, 2], [1, 3], [1, 4], [2, 5], [3, 5], [4, 5], [5, 6]],
    },
  },
  {
    info: {
      id: 'ci-cd-pipeline',
      name: 'CI/CD Pipeline',
      description: 'Build, test, security-scan, and deploy stages with rollback on failure.',
      complexity: 'advanced',
      nodeCount: 16,
      laneCount: 3,
    },
    yaml: YAML_CI_CD_PIPELINE,
    topo: {
      lanes: 3,
      nodes: [[0, 0, 'a'], [1, 1, 'a'], [2, 1, 'a'], [3, 1, 'p'], [4, 1, 'a'], [4, 1, 'a'], [4, 1, 'a'], [5, 1, 's'], [6, 2, 'a'], [7, 0, 'w'], [8, 2, 'a'], [9, 2, 't'], [6, 1, 'a'], [9, 1, 't'], [5, 1, 'e'], [7, 2, 'e']],
      edges: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [3, 6], [4, 7], [5, 7], [6, 7], [7, 8], [7, 12], [8, 9], [9, 10], [10, 11], [12, 13], [2, 14], [8, 15], [14, 13], [15, 13]],
    },
  },
  {
    info: {
      id: 'patient-intake',
      name: 'Patient Intake',
      description: 'Hospital onboarding flow covering registration, triage, records, and billing lanes.',
      complexity: 'advanced',
      nodeCount: 14,
      laneCount: 4,
    },
    yaml: YAML_PATIENT_INTAKE,
    topo: {
      lanes: 4,
      nodes: [[0, 0, 'a'], [1, 1, 'a'], [2, 1, 's'], [3, 1, 'a'], [3, 1, 'a'], [4, 1, 'a'], [5, 3, 's'], [6, 1, 'a'], [6, 1, 'a'], [7, 2, 's'], [8, 2, 'a'], [9, 2, 'a'], [10, 1, 'a'], [11, 0, 't'], [11, 0, 't']],
      edges: [[0, 1], [1, 2], [2, 3], [2, 4], [3, 5], [4, 5], [5, 6], [6, 7], [6, 8], [7, 9], [8, 9], [9, 10], [9, 11], [10, 12], [11, 14], [12, 13]],
    },
  },
  {
    info: {
      id: 'subscription-billing',
      name: 'Subscription Billing',
      description: 'SaaS billing lifecycle: trial, upgrade, dunning retries, and cancellation paths.',
      complexity: 'advanced',
      nodeCount: 11,
      laneCount: 3,
    },
    yaml: YAML_SUBSCRIPTION_BILLING,
    topo: {
      lanes: 3,
      nodes: [[0, 0, 'a'], [1, 1, 'a'], [2, 1, 'a'], [3, 2, 'a'], [4, 1, 'a'], [5, 1, 'a'], [6, 1, 's'], [7, 0, 'a'], [8, 1, 'e'], [9, 0, 'a'], [10, 0, 't'], [10, 0, 't']],
      edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [6, 8], [7, 10], [8, 9], [9, 11]],
    },
  },
  {
    info: {
      id: 'e-commerce-fulfillment',
      name: 'E-Commerce Fulfillment',
      description: 'End-to-end order lifecycle from cart checkout to last-mile delivery and returns.',
      complexity: 'showcase',
      nodeCount: 20,
      laneCount: 5,
    },
    yaml: YAML_E_COMMERCE_FULFILLMENT,
    topo: {
      lanes: 5,
      nodes: [[0, 0, 'a'], [1, 4, 'a'], [2, 4, 's'], [3, 4, 'w'], [3, 1, 'a'], [4, 1, 'a'], [5, 2, 's'], [6, 2, 'w'], [6, 2, 'p'], [7, 2, 'a'], [8, 3, 's'], [9, 3, 'a'], [10, 3, 'w'], [11, 4, 'a'], [12, 4, 'a'], [13, 0, 's'], [14, 2, 'a'], [15, 4, 'a'], [16, 0, 't'], [16, 0, 't']],
      edges: [[0, 1], [1, 2], [2, 3], [2, 4], [2, 5], [3, 5], [4, 5], [5, 6], [6, 7], [6, 8], [7, 9], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [13, 16], [14, 15], [15, 18], [1, 19]],
    },
  },
  {
    info: {
      id: 'insurance-claims',
      name: 'Insurance Claims',
      description: 'Full claims processing pipeline: submission, adjudication, fraud check, and payout.',
      complexity: 'showcase',
      nodeCount: 23,
      laneCount: 5,
    },
    yaml: YAML_INSURANCE_CLAIMS,
    topo: {
      lanes: 5,
      nodes: [[0, 0, 'a'], [1, 1, 'a'], [2, 1, 's'], [3, 1, 's'], [4, 2, 's'], [5, 2, 'a'], [6, 2, 'w'], [7, 2, 's'], [8, 2, 'a'], [9, 4, 'a'], [10, 2, 'a'], [11, 2, 's'], [12, 2, 'a'], [12, 3, 'a'], [13, 2, 'a'], [14, 1, 'a'], [15, 0, 'w'], [16, 1, 's'], [17, 4, 'a'], [18, 3, 'a'], [19, 3, 's'], [20, 1, 'a'], [21, 0, 't'], [21, 0, 't']],
      edges: [[0, 1], [1, 2], [2, 3], [2, 8], [3, 4], [3, 8], [4, 5], [4, 8], [5, 6], [6, 7], [7, 8], [7, 20], [7, 9], [8, 10], [9, 10], [10, 11], [11, 12], [11, 13], [11, 9], [12, 14], [13, 14], [14, 15], [15, 16], [16, 17], [16, 18], [16, 10], [17, 21], [18, 19], [19, 15], [19, 20], [20, 22]],
    },
  },
]

const templateMap = new Map(TEMPLATES.map((t) => [t.info.id, t]))

export function getTemplates(): TemplateInfo[] {
  return TEMPLATES.map((t) => t.info)
}

export function getTemplateTopo(id: string): TemplateTopo {
  const entry = templateMap.get(id)
  if (!entry) throw new Error(`Unknown template: ${id}`)
  return entry.topo
}

export function loadTemplate(id: string): FlowprintDocument {
  const entry = templateMap.get(id)
  if (!entry) throw new Error(`Unknown template: ${id}`)
  return parse(entry.yaml) as FlowprintDocument
}
