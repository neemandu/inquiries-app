#!/usr/bin/env bash
# Pushes the local Lambda code to AWS (eu-west-2) and sets AIRTABLE_API_KEY from lambda/.env.
#
#   ./deploy.sh                 update all existing functions (environment variable first, then code)
#   ./deploy.sh getInquires     update just one
#
# Existing functions were created in the AWS console, so they're updated in place here; deploying their
# template.yaml with SAM would create new copies with new URLs instead. New functions (getArchivedEmployees,
# restoreEmployees, deleteEmployees) are created with SAM; see README.md.
set -euo pipefail
cd "$(dirname "$0")"
REGION=eu-west-2
set -a; . ./.env; set +a
: "${AIRTABLE_API_KEY:?AIRTABLE_API_KEY missing from lambda/.env}"

EXISTING=(getInquires createNewReportingPeriod getClientsEmails getMissingDocsByEmployer
          getMonthlyEmployeesDataByEmployeeId UpdateColumnsForEmployer updateMonthlyItems)
FUNCTIONS=("${@:-${EXISTING[@]}}")

for fn in "${FUNCTIONS[@]}"; do
  echo "== $fn"
  # Keep the function's other environment variables; add or replace AIRTABLE_API_KEY
  vars=$(aws lambda get-function-configuration --region "$REGION" --function-name "$fn" \
           --query 'Environment.Variables' --output json)
  env_json=$(VARS="$vars" python3 -I -c 'import json,os; v=json.loads(os.environ["VARS"]) or {}; v["AIRTABLE_API_KEY"]=os.environ["AIRTABLE_API_KEY"]; print(json.dumps({"Variables": v}))')
  aws lambda update-function-configuration --region "$REGION" --function-name "$fn" \
    --environment "$env_json" --query 'LastUpdateStatus' --output text
  aws lambda wait function-updated --region "$REGION" --function-name "$fn"

  zip_file=$(mktemp --suffix=.zip); rm -f "$zip_file"
  (cd "$fn/src" && zip -qr "$zip_file" .)
  aws lambda update-function-code --region "$REGION" --function-name "$fn" \
    --zip-file "fileb://$zip_file" --query 'LastUpdateStatus' --output text
  aws lambda wait function-updated --region "$REGION" --function-name "$fn"
  rm -f "$zip_file"
done
echo "Done. Revoke the old token in Airtable only after every function is updated and working."
