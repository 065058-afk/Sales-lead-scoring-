from pathlib import Path

import pandas as pd
import streamlit as st


APP_DIR = Path(__file__).parent
SAMPLE_FILE = APP_DIR / "sample-leads.csv"
LARGE_FILE = APP_DIR / "large-leads-300.csv"

BASE_COLUMNS = [
    "Company",
    "Contact",
    "Industry",
    "Employees",
    "Annual Revenue",
    "Website Visits",
    "Email Opens",
    "Demo Requested",
    "Intent Score",
    "Lead Source",
]

INDUSTRY_FIT = {
    "SaaS": 100,
    "Healthcare": 88,
    "Financial Services": 92,
    "Manufacturing": 70,
    "Retail": 62,
    "Education": 66,
    "Other": 50,
}

SOURCE_FIT = {
    "Referral": 100,
    "Partner": 92,
    "Webinar": 86,
    "Website": 78,
    "Paid Search": 64,
    "Outbound": 48,
}


st.set_page_config(
    page_title="Sales Lead-Scoring Assistant",
    page_icon="SL",
    layout="wide",
)


st.markdown(
    """
    <style>
    .block-container {
        padding-top: 1.4rem;
    }
    div[data-testid="stMetric"] {
        background: #ffffff;
        border: 1px solid #d8e0e5;
        border-radius: 8px;
        padding: 14px 16px;
        box-shadow: 0 10px 28px rgba(23, 35, 45, 0.07);
    }
    .tier-hot {
        color: #07552c;
        background: #dff6e9;
        padding: 0.15rem 0.45rem;
        border-radius: 999px;
        font-weight: 700;
    }
    .tier-warm {
        color: #6f4300;
        background: #fff1d8;
        padding: 0.15rem 0.45rem;
        border-radius: 999px;
        font-weight: 700;
    }
    .tier-cold {
        color: #802a26;
        background: #fde4e2;
        padding: 0.15rem 0.45rem;
        border-radius: 999px;
        font-weight: 700;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


def load_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        return pd.DataFrame(columns=BASE_COLUMNS)
    return normalize_dataframe(pd.read_csv(path))


def normalize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    column_aliases = {
        "company": "Company",
        "account": "Company",
        "contact": "Contact",
        "name": "Contact",
        "leadname": "Contact",
        "industry": "Industry",
        "employees": "Employees",
        "companysize": "Employees",
        "annualrevenue": "Annual Revenue",
        "revenue": "Annual Revenue",
        "revenuem": "Annual Revenue",
        "arr": "Annual Revenue",
        "websitevisits": "Website Visits",
        "sitevisits": "Website Visits",
        "visits": "Website Visits",
        "emailopens": "Email Opens",
        "emails": "Email Opens",
        "opens": "Email Opens",
        "demorequested": "Demo Requested",
        "demorequest": "Demo Requested",
        "demo": "Demo Requested",
        "intentscore": "Intent Score",
        "intent": "Intent Score",
        "leadsource": "Lead Source",
        "source": "Lead Source",
    }

    normalized = {}
    for column in df.columns:
        key = str(column).lower().replace(" ", "").replace("_", "").replace("-", "")
        normalized[column] = column_aliases.get(key, column)

    df = df.rename(columns=normalized).copy()

    for column in BASE_COLUMNS:
        if column not in df.columns:
            df[column] = default_value_for(column)

    df = df[BASE_COLUMNS]
    df["Company"] = df["Company"].fillna("Untitled Account").astype(str)
    df["Contact"] = df["Contact"].fillna("Unknown Contact").astype(str)
    df["Industry"] = df["Industry"].fillna("Other").astype(str)
    df["Lead Source"] = df["Lead Source"].fillna("Website").astype(str)
    df["Demo Requested"] = (
        df["Demo Requested"]
        .fillna("no")
        .astype(str)
        .str.lower()
        .str.strip()
        .map(lambda value: "yes" if value.startswith("y") else "no")
    )

    numeric_columns = ["Employees", "Annual Revenue", "Website Visits", "Email Opens", "Intent Score"]
    for column in numeric_columns:
        df[column] = pd.to_numeric(df[column], errors="coerce").fillna(0)

    df["Employees"] = df["Employees"].clip(lower=0).round(0).astype(int)
    df["Website Visits"] = df["Website Visits"].clip(lower=0).round(0).astype(int)
    df["Email Opens"] = df["Email Opens"].clip(lower=0).round(0).astype(int)
    df["Intent Score"] = df["Intent Score"].clip(lower=0, upper=100).round(0).astype(int)
    df["Annual Revenue"] = df["Annual Revenue"].clip(lower=0).round(1)

    return df


def default_value_for(column: str):
    defaults = {
        "Company": "Untitled Account",
        "Contact": "Unknown Contact",
        "Industry": "Other",
        "Employees": 0,
        "Annual Revenue": 0,
        "Website Visits": 0,
        "Email Opens": 0,
        "Demo Requested": "no",
        "Intent Score": 0,
        "Lead Source": "Website",
    }
    return defaults[column]


def score_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df.assign(
            Firmographic= pd.Series(dtype="int"),
            Engagement= pd.Series(dtype="int"),
            SourceScore= pd.Series(dtype="int"),
            **{"Lead Score": pd.Series(dtype="int")},
            Tier=pd.Series(dtype="str"),
            **{"Next Action": pd.Series(dtype="str")},
        )

    scored = normalize_dataframe(df)
    employees = scored["Employees"]
    revenue = scored["Annual Revenue"]

    employee_fit = pd.Series(42, index=scored.index)
    employee_fit = employee_fit.mask((employees >= 50) & (employees < 200), 68)
    employee_fit = employee_fit.mask((employees >= 200) & (employees <= 3000), 100)
    employee_fit = employee_fit.mask(employees > 3000, 78)

    revenue_fit = pd.Series(36, index=scored.index)
    revenue_fit = revenue_fit.mask((revenue >= 5) & (revenue < 20), 60)
    revenue_fit = revenue_fit.mask((revenue >= 20) & (revenue <= 500), 100)
    revenue_fit = revenue_fit.mask(revenue > 500, 80)

    industry_fit = scored["Industry"].map(INDUSTRY_FIT).fillna(INDUSTRY_FIT["Other"])
    source_fit = scored["Lead Source"].map(SOURCE_FIT).fillna(58)

    scored["Firmographic"] = (
        employee_fit * 0.32 + revenue_fit * 0.28 + industry_fit * 0.40
    ).round().astype(int)

    scored["Engagement"] = (
        (scored["Website Visits"] * 5).clip(0, 100) * 0.25
        + (scored["Email Opens"] * 9).clip(0, 100) * 0.18
        + scored["Demo Requested"].map({"yes": 100, "no": 20}).fillna(20) * 0.27
        + scored["Intent Score"] * 0.30
    ).round().astype(int)

    scored["SourceScore"] = source_fit.round().astype(int)
    scored["Lead Score"] = (
        scored["Firmographic"] * 0.40
        + scored["Engagement"] * 0.45
        + scored["SourceScore"] * 0.15
    ).round().astype(int)

    scored["Tier"] = pd.cut(
        scored["Lead Score"],
        bins=[-1, 54, 79, 100],
        labels=["Cold", "Warm", "Hot"],
    ).astype(str)

    scored["Next Action"] = scored.apply(next_action, axis=1)
    return scored


def next_action(row: pd.Series) -> str:
    if row["Tier"] == "Hot":
        if row["Demo Requested"] == "yes":
            return "Route to AE today for demo follow-up"
        return "Call within 24 hours and offer a tailored demo"
    if row["Tier"] == "Warm":
        return "Add to nurture sequence and schedule SDR follow-up"
    return "Keep in awareness campaign until engagement increases"


def reset_leads(df: pd.DataFrame) -> None:
    st.session_state["leads"] = normalize_dataframe(df)


if "leads" not in st.session_state:
    st.session_state["leads"] = pd.DataFrame(columns=BASE_COLUMNS)


st.title("Sales Lead-Scoring Assistant")
st.caption("Upload, score, tier, prioritize, and export sales leads for CRM follow-up.")

with st.sidebar:
    st.header("Lead data")
    uploaded_file = st.file_uploader("Upload leads CSV", type=["csv"])
    if uploaded_file is not None:
        reset_leads(pd.read_csv(uploaded_file))
        st.success(f"Imported {len(st.session_state['leads']):,} leads.")

    col_a, col_b = st.columns(2)
    with col_a:
        if st.button("Load sample", use_container_width=True):
            reset_leads(load_csv(SAMPLE_FILE))
    with col_b:
        if st.button("Load 300", use_container_width=True):
            reset_leads(load_csv(LARGE_FILE))

    if st.button("Clear leads", use_container_width=True):
        reset_leads(pd.DataFrame(columns=BASE_COLUMNS))

    st.divider()
    st.header("Add lead")
    with st.form("add_lead_form", clear_on_submit=True):
        company = st.text_input("Company", "Northstar Systems")
        contact = st.text_input("Contact", "Ava Mehta")
        industry = st.selectbox("Industry", list(INDUSTRY_FIT.keys()))
        employees = st.number_input("Employees", min_value=0, value=250, step=10)
        revenue = st.number_input("Annual Revenue ($M)", min_value=0.0, value=25.0, step=1.0)
        visits = st.number_input("Website Visits", min_value=0, value=8, step=1)
        emails = st.number_input("Email Opens", min_value=0, value=3, step=1)
        demo = st.selectbox("Demo Requested", ["yes", "no"])
        intent = st.slider("Intent Score", 0, 100, 55)
        source = st.selectbox("Lead Source", list(SOURCE_FIT.keys()))
        submitted = st.form_submit_button("Add and score lead", use_container_width=True)

    if submitted:
        new_row = pd.DataFrame(
            [
                {
                    "Company": company,
                    "Contact": contact,
                    "Industry": industry,
                    "Employees": employees,
                    "Annual Revenue": revenue,
                    "Website Visits": visits,
                    "Email Opens": emails,
                    "Demo Requested": demo,
                    "Intent Score": intent,
                    "Lead Source": source,
                }
            ]
        )
        reset_leads(pd.concat([new_row, st.session_state["leads"]], ignore_index=True))
        st.success(f"Added {company}.")


scored_df = score_dataframe(st.session_state["leads"])

hot_count = int((scored_df["Tier"] == "Hot").sum()) if not scored_df.empty else 0
warm_count = int((scored_df["Tier"] == "Warm").sum()) if not scored_df.empty else 0
cold_count = int((scored_df["Tier"] == "Cold").sum()) if not scored_df.empty else 0
average_score = int(round(scored_df["Lead Score"].mean())) if not scored_df.empty else 0

metric_cols = st.columns(4)
metric_cols[0].metric("Hot", hot_count, "Score 80-100")
metric_cols[1].metric("Warm", warm_count, "Score 55-79")
metric_cols[2].metric("Cold", cold_count, "Score 0-54")
metric_cols[3].metric("Average Score", average_score)

st.subheader("Lead Queue")
filter_cols = st.columns([2.4, 1, 1.4])
query = filter_cols[0].text_input("Search", placeholder="Company, contact, industry, tier...")
tier_filter = filter_cols[1].selectbox("Tier", ["All", "Hot", "Warm", "Cold"])
sort_choice = filter_cols[2].selectbox(
    "Sort",
    ["Score high to low", "Score low to high", "Company A-Z", "Engagement high to low"],
)

filtered = scored_df.copy()
if query:
    search_text = filtered.astype(str).agg(" ".join, axis=1).str.lower()
    filtered = filtered[search_text.str.contains(query.lower(), regex=False)]

if tier_filter != "All":
    filtered = filtered[filtered["Tier"] == tier_filter]

if sort_choice == "Score high to low":
    filtered = filtered.sort_values("Lead Score", ascending=False)
elif sort_choice == "Score low to high":
    filtered = filtered.sort_values("Lead Score", ascending=True)
elif sort_choice == "Company A-Z":
    filtered = filtered.sort_values("Company", ascending=True)
else:
    filtered = filtered.sort_values("Engagement", ascending=False)

display_columns = BASE_COLUMNS + ["Firmographic", "Engagement", "Lead Score", "Tier", "Next Action"]
st.dataframe(
    filtered[display_columns],
    use_container_width=True,
    hide_index=True,
    column_config={
        "Annual Revenue": st.column_config.NumberColumn("Annual Revenue ($M)", format="$%.1fM"),
        "Lead Score": st.column_config.ProgressColumn(
            "Lead Score",
            min_value=0,
            max_value=100,
            format="%d",
        ),
        "Intent Score": st.column_config.ProgressColumn(
            "Intent Score",
            min_value=0,
            max_value=100,
            format="%d",
        ),
    },
)

export_csv = filtered[display_columns].to_csv(index=False).encode("utf-8")
st.download_button(
    "Export CRM CSV",
    data=export_csv,
    file_name="crm-lead-scores.csv",
    mime="text/csv",
    disabled=filtered.empty,
)

with st.expander("Scoring model"):
    st.write(
        "The model uses 40% firmographic fit, 45% engagement, and 15% source quality. "
        "Hot leads score 80-100, warm leads score 55-79, and cold leads score 0-54."
    )

    if not scored_df.empty:
        top_lead = scored_df.sort_values("Lead Score", ascending=False).iloc[0]
        st.success(
            f"Recommended focus: {top_lead['Company']} scored {top_lead['Lead Score']} "
            f"({top_lead['Tier']}). {top_lead['Next Action']}."
        )
