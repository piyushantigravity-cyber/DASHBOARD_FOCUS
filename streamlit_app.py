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

# Hide Streamlit UI elements for a clean dashboard look
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
    }
    iframe {
        border-radius: 0px;
    }
    </style>
"""
st.markdown(hide_style, unsafe_allow_html=True)

@st.cache_data
def compile_dashboard():
    # Resolves paths relative to this script
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    html_path = os.path.join(base_dir, "index.html")
    css_path = os.path.join(base_dir, "style.css")
    js_path = os.path.join(base_dir, "app.js")
    
    if not (os.path.exists(html_path) and os.path.exists(css_path) and os.path.exists(js_path)):
        return "<h3>Error: Core dashboard files (index.html, style.css, app.js) were not found in the workspace.</h3>"
        
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()
        
    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()
        
    with open(js_path, "r", encoding="utf-8") as f:
        js = f.read()
        
    # Inject CSS stylesheet
    html = html.replace(
        '<link rel="stylesheet" href="style.css">',
        f'<style>\n{css}\n</style>'
    )
    
    # Inject JS app logic
    html = html.replace(
        '<script type="text/babel" src="app.js"></script>',
        f'<script type="text/babel">\n{js}\n</script>'
    )
    
    return html

def main():
    try:
        bundled_html = compile_dashboard()
        # Display the compiled dashboard inside the Streamlit context
        components.html(bundled_html, height=950, scrolling=True)
    except Exception as e:
        st.error(f"Failed to load the Executive dashboard: {e}")

if __name__ == "__main__":
    main()
