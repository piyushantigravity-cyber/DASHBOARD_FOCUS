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
        padding-top: 0rem;
        padding-bottom: 0rem;
        padding-left: 0rem;
        padding-right: 0rem;
        max-width: 100% !important;
    }
    </style>
""", unsafe_allow_html=True)

@st.cache_data
def load_bundle():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    bundle_path = os.path.join(base_dir, "index_bundle.html")
    if not os.path.exists(bundle_path):
        return "<h2 style='color:red'>index_bundle.html not found</h2>"
    with open(bundle_path, "r", encoding="utf-8") as f:
        return f.read()

def main():
    html = load_bundle()
    try:
        import streamlit.components.v1 as components
        components.html(html, height=1080, scrolling=True)
    except Exception as e:
        st.error(f"Render error: {e}")

if __name__ == "__main__":
    main()
