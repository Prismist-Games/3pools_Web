import React from 'react';
import { AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-8 text-left">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full border-2 border-red-200">
                        <div className="flex items-center gap-4 mb-6 text-red-600">
                            <AlertCircle size={48} />
                            <h1 className="text-3xl font-black">Something went wrong</h1>
                        </div>
                        <div className="bg-stone-900 text-stone-50 p-6 rounded-xl overflow-auto max-h-[60vh] text-sm font-mono shadow-inner">
                            <p className="text-red-300 font-bold text-lg mb-2">{this.state.error && this.state.error.toString()}</p>
                            <pre className="whitespace-pre-wrap text-stone-400">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-8 px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg"
                        >
                            Reload Game
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
