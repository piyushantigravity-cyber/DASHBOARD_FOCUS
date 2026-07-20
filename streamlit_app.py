import streamlit as st
import streamlit.components.v1 as components
import os

# Streamlit Page configuration
st.set_page_config(
    page_title="Executive HQ Dashboard",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Hide Streamlit UI chrome for a clean dashboard
hide_style = """
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
    iframe {
        border-radius: 0px;
    }
    </style>
"""
st.markdown(hide_style, unsafe_allow_html=True)

@st.cache_data
def compile_dashboard():
    base_dir = os.path.dirname(os.path.abspath(__file__))

    html_path = os.path.join(base_dir, "index.html")
    css_path  = os.path.join(base_dir, "style.css")
    js_path   = os.path.join(base_dir, "app.js")

    missing = [p for p in [html_path, css_path, js_path] if not os.path.exists(p)]
    if missing:
        return f"<h3 style='color:red'>Missing files: {missing}</h3>"

    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()
    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()
    with open(js_path, "r", encoding="utf-8") as f:
        js = f.read()

    # Inject CSS inline (replaces external link)
    html = html.replace(
        '<link rel="stylesheet" href="style.css">',
        f'<style>\n{css}\n</style>'
    )

    # Inject JS inline (replaces external script src)
    html = html.replace(
        '<script type="text/babel" src="app.js"></script>',
        f'<script type="text/babel">\n{js}\n</script>'
    )

    # Remove Google Fonts (optional: speeds load, avoids iframe CSP issues)
    # Uncomment next 3 lines if fonts cause blank screen on Streamlit Cloud:
    # html = html.replace('<link rel="preconnect" href="https://fonts.googleapis.com">', '')
    # html = html.replace('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>', '')
    # html = html.replace('<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">', '')

    return html

def main():
    try:
        bundled_html = compile_dashboard()
        # Use a tall fixed height to avoid scroll issues inside the iframe
        # Adjust this value to match your screen height preference
        components.html(bundled_html, height=1080, scrolling=True)
    except Exception as e:
        st.error(f"Dashboard load error: {e}")
        st.exception(e)

if __name__ == "__main__":
    main()
