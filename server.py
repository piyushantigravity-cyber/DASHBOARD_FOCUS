import http.server
import socketserver
import webbrowser
import os

PORT = 8000
DIRECTORY = os.path.dirname(os.path.realpath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def run():
    # Changes working directory to project folder
    os.chdir(DIRECTORY)
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}"
        print("====================================================")
        print(f"Executive.HQ Local Server started successfully.")
        print(f"Serving files from: {DIRECTORY}")
        print(f"Opening dashboard in your web browser: {url}")
        print("Press Ctrl+C to stop the server.")
        print("====================================================")
        
        # Auto-open browser
        webbrowser.open(url)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped. Secure terminal disconnected.")

if __name__ == "__main__":
    run()
