# Lambda functions

Source of the AWS Lambda functions behind the app's `/api/*` routes (region eu-west-2, each behind its own
API Gateway). Only `lambda/.env` is in `.gitignore`; everything else here belongs in git.

## Airtable key

The Airtable token is no longer in the code. Every function reads `process.env.AIRTABLE_API_KEY`, and the
value lives only in `lambda/.env` (never commit it) and in each function's environment variables in AWS.

## Updating the existing functions

```
./deploy.sh                # all of them
./deploy.sh getInquires    # one
```

It sets `AIRTABLE_API_KEY` on the function first and then uploads the code, so a function never runs the new
code without the key. Needs the AWS CLI signed in to the account that owns the functions.

## New functions (employee archive)

| Function | Call | Returns |
|---|---|---|
| `getArchivedEmployees` | `GET ?employerRecordId=rec…` | `[{ id, firstName, lastName, idNumber, leavingDate, leavingReason }]` |
| `restoreEmployees` | `POST { employerId, recordIds: [...], updatedBy? }` | `{ restored, alreadyActive }` |
| `deleteEmployees` | `POST { employerId, recordIds: [...] }` | `{ deleted, skipped: [{ id, reason }] }` |

- All three work on "עובדי לקוחות"; archived means `סטטוס עובד = "לא עובד"`.
- restore and delete refuse the whole request (404) if any ID isn't one of that employer's employees.
- restore sets `סטטוס עובד = "עובד"` and keeps the leaving date and reason. It doesn't add the employee to the
  current period's monthly report.
- delete removes only archived employees with no monthly reports or pay slips; others come back in `skipped`.

Create them with the AWS SAM CLI (one stack each, like the existing functions):

```
cd getArchivedEmployees
sam deploy --guided --region eu-west-2 --parameter-overrides AirtableApiKey=$AIRTABLE_API_KEY
```

The API address printed at the end goes into the app's server route for that action.

## Testing locally

```
set -a; . ./.env; set +a
node --input-type=module -e "const {handler}=await import('./getArchivedEmployees/src/index.mjs'); console.log(await handler({queryStringParameters:{employerRecordId:'rec…'}}))"
```
