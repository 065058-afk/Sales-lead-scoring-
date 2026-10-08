# Sales Lead-Scoring Assistant

A browser-based sales operations app for importing, scoring, tiering, and exporting sales leads.

## Features

- CSV upload and manual lead entry
- Firmographic scoring from industry, employee count, and revenue
- Engagement scoring from visits, email opens, demo request, and intent score
- Lead source confidence scoring
- Hot, warm, and cold tiering
- Search, tier filtering, and sorting
- CRM-style CSV export with score, tier, and recommended next action
- One-click pipeline summary copy

## Run It

### Browser version

1. Open `standalone.html` in a web browser.
2. Click **Load Sample** to try the demo data, or upload `sample-leads.csv`.
3. For a larger test, upload `large-leads-300.csv`.
4. Add leads manually from the left panel if needed.
5. Use **Export CRM CSV** to download scored leads.

No server or package installation is required.

If your browser blocks local file behavior, open a terminal in this folder and run:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000/standalone.html`.

### Streamlit version

1. Open a terminal in this folder.
2. Create and activate a virtual environment.
3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Run the Streamlit app:

```bash
streamlit run streamlit_app.py
```

If the `streamlit` command is not found, use:

```bash
python -m streamlit run streamlit_app.py
```

## Deploy On Streamlit Community Cloud

1. Push the contents of this folder to a GitHub repository.
2. Go to Streamlit Community Cloud and create a new app.
3. Select the repository, branch, and app file.
4. Set the main file path to `streamlit_app.py`.
5. Deploy.

Streamlit will install `streamlit` and `pandas` from `requirements.txt`.

If you push the entire parent workspace instead of this app folder, set the main file path to `outputs/sales-lead-scoring-assistant/streamlit_app.py` and make sure `requirements.txt` is available at the repository root.

## CSV Columns

The importer accepts these headers:

- `Company`
- `Contact`
- `Industry`
- `Employees`
- `Annual Revenue`
- `Website Visits`
- `Email Opens`
- `Demo Requested`
- `Intent Score`
- `Lead Source`

Alternative common names such as `Revenue`, `Visits`, `Emails`, `Demo`, `Source`, and `Name` are also handled.
