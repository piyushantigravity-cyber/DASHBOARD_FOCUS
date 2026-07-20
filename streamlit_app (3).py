import streamlit as st
import os

st.set_page_config(
    page_title="Executive HQ Dashboard",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

st.markdown("""
    <style>
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    .block-container {
        padding-top: 0rem !important;
        padding-bottom: 0rem !important;
        padding-left: 0rem !important;
        padding-right: 0rem !important;
        max-width: 100% !important;
    }
    </style>
""", unsafe_allow_html=True)

@st.cache_data
def load_bundle():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    bundle_path = os.path.join(base_dir, "index_bundle.html")
    if not os.path.exists(bundle_path):
        return "<h2 style='color:red'>index_bundle.html not found.</h2>"
    with open(bundle_path, "r", encoding="utf-8") as f:
        return f.read()

def main():
    st.write(f"Streamlit version: {st.__version__}")
    html = load_bundle()
    st.write(f"Bundle loaded: {len(html)} bytes")
    st.markdown(html, unsafe_allow_html=True)

if __name__ == "__main__":
    main()
