# Expanded engineering job monitor

Import **US Engineering Job Monitor - expanded company sources.json** into n8n.

All **35 companies** from the original Company sources node are retained. **30 have implemented job collectors with live-verified listings**, **Godrej Americas has an explicit no-open-positions notice check**, and **4 are intentionally excluded at your request**. Work on those four sources is no longer required.

The original file in Downloads is unchanged. The export is inactive and has no instance workflow ID, so import it as a new workflow. The GitHub version removes personal credential references and uses `you@example.com` as the alert recipient. Select your Gmail and Gemini credentials and replace that address in **Gmail new-job alert** before running. All three Data Table nodes refer by name to the new `monitored_jobs_expanded` table; no old table ID is retained. No emails were sent and no live n8n workflow was modified.

## Before enabling

1. Import the JSON and select your existing Gmail and Gemini credentials if n8n asks. Create `monitored_jobs_expanded` in the same n8n project before running: String columns `job_key`, `company`, `job_title`, `location`, `apply_url`, `posted_date`, `first_seen`, `sponsorship_status`, `reason`; Number column `match_score`; Boolean column `notified`. Importing a workflow does not create this table.
2. For a collection-only test, execute through **Source coverage report**, **Description failures**, and **Title & US prefilter**. Executing the entire workflow can send the existing Gmail alerts and write to the new data table.
3. Inspect **Source setup report**, **First page failures**, **Source coverage report**, and **Description failures**. These diagnostics appear in execution data; they do not send separate notifications.
4. Confirm the existing Gemini scoring node works in your instance, then activate the 30-minute schedule. The Gemini model configuration was inherited without changes or live testing.

## What changed

- Added Workday, SmartRecruiters, Oracle Recruiting, iCIMS/Jibe, Amazon, TikTok/ByteDance, ADP Workforce Now, UKG, Google careers, and Staples adapters alongside Greenhouse.
- Sources use explicit company metadata through every page request, avoiding attribution by response position alone.
- First-page responses determine pagination. The workflow checks the reported pages, deduplicates job IDs, and reports failed pages and possible source caps.
- Full job descriptions are retrieved for systems whose listing APIs provide only summaries. Failed or empty descriptions are reported and excluded from scoring.
- The engineering-title rules, AI scoring, Gmail digest, saved-job table, and separate Children's Mercy branch are retained. US filtering now recognizes explicit country fields and multiple locations from the new sources.
- Removed the disconnected experimental Humana nodes from the new export. Humana is part of the scheduled source pipeline.
- The description batch follows one conditional path, avoiding a new merge that could wait forever for an empty description branch.

## Intentionally excluded sources

FMA Logistics, Sterling Bank & Trust / EverBank, Meta, and Whirlpool are excluded at your request. They remain in the source registry with `enabled: false` and `status: excluded_by_user` for reference. No website or further setup is needed for these companies.

Godrej is scoped to **Godrej Americas**, whose careers page explicitly says it has no open positions. If that text changes, the check produces an error requesting review. It does not automatically extract future job listings.

Saint Luke's is the **Kansas City health system**, as confirmed by the user. Its official BJC careers site links to the Workday source included here. LG is scoped to LG Electronics North America, and Samsung to the Samsung Electronics Workday board; these are not exhaustive monitors of every subsidiary.

## Verification and limits

Public endpoint checks on October 9, 2026 returned valid listings for all 30 implemented job sources. Local tests passed against **3,325 real listing records**, **18 full-description samples**, and **22 live second pages**. All Code nodes compile, connection targets exist, and tests cover schema/HTTP failures, deduplication assumptions, US multi-location filtering, title exclusions, and description-batch edge cases.

This export has **not been imported into or executed in a live n8n instance**. Public endpoint and parser tests do not verify n8n credentials, item-linking execution, Gmail delivery, data-table access, or the inherited Children's Mercy branch. A manual n8n run is still required.

Some Workday searches report a 2,000-result ceiling; Amazon reports at most 10,000 results. These sources are flagged `partial` in the coverage report when that limit is reached. The collector follows the visible result set, so it cannot guarantee exhaustive historical coverage. Sources can also change during a paginated crawl. The 500-page guard rejects unexpectedly large sources with a visible error instead of silently truncating them.

Full-description retrieval is title-filtered but occurs before the existing saved-job check. Large runs can make many public HTTP requests. The new HTTP nodes use batches of four, a 250 ms batch interval, and a 30-second timeout. Measure runtime before relying on the 30-minute schedule.

The separate Children's Mercy branch was preserved, including its existing pagination, HTML extraction, and merge behavior; it was not included in the new-source live verification.

## Files

- `company-sources.json`: all 35 source configurations, status, notes, and URLs.
- `validation-report.json`: parser verification results and limitations.
- `adapters.js`, `build_workflow.js`, `test_workflow.js`: editable source and local validation. Run `node build_workflow.js` and then `node test_workflow.js` to rebuild and test against saved research fixtures.
- `probe*.json`: read-only endpoint check inputs. Raw responses in `research/` are excluded from Git, so fixture tests require locally collected responses. Run `python probe_sources.py <config-file>` for the probe configurations to collect them; live sites may have changed since validation. The existing validation report records the local fixture run.
- `original-workflow.json`: sanitized baseline used by the build script. Personal local backups (`*.local.json`) are excluded from Git.

Source references: [Saint Luke's at BJC](https://jobs.bjc.org/saint-lukes-careers), [EverBank's Sterling acquisition announcement](https://www.everbank.com/about/news/04-01-25/everbank-acquires-sterling-bank), [Godrej Americas careers](https://www.godrejamericas.com/careers.html), [PSI careers](https://www.psiexams.com/about-psi/careers/), [CBIZ careers](https://www.cbiz.com/careers), [n8n HTTP Request documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/).

## Fix for a run stopping at Page requests

The earlier export expected text HTTP responses in `body`, whereas n8n defaults to `data`. The corrected export explicitly sets `Put Output in Field` to `body` and its parser also accepts the default `data` string.

To repair an already-imported workflow without reimporting, open each of **Fetch first source pages**, **Fetch all source pages**, and **Fetch full descriptions**. Under **Options → Response**, keep **Response Format: Text** and set **Put Output in Field: body**. Rerun the workflow from the beginning so the old response data is replaced. Unpin old response outputs if applicable.

Also set **Body Content Type: JSON** and **Specify Body: Using JSON** in **Fetch first source pages** and **Fetch all source pages**. Keep the existing Send Body expression and JSON body expression. The corrected export explicitly sets `contentType: json`; earlier exports omitted it, which can leave POST bodies incorrectly formatted. These configuration fixes do not resolve a genuine site access restriction such as BJC returning HTTP 403 from the n8n host.
