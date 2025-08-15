#!/usr/bin/env python3
"""
Streamlit UI for Motia Invoice OCR Example

This provides a user-friendly interface for uploading invoice documents,
running the OCR pipeline, and viewing extracted data.
"""

import streamlit as st
import subprocess
import os
import pandas as pd
import time
from pathlib import Path
import json
from datetime import datetime

# Page configuration
st.set_page_config(
    page_title="Motia Invoice OCR",
    page_icon="📄",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for better styling
st.markdown("""
<style>
    .main-header {
        background: linear-gradient(90deg, #e74c3c 0%, #c0392b 100%);
        padding: 2rem;
        border-radius: 10px;
        color: white;
        text-align: center;
        margin-bottom: 2rem;
    }
    .upload-area {
        border: 2px dashed #e74c3c;
        border-radius: 10px;
        padding: 2rem;
        text-align: center;
        background-color: #f8f9fa;
        margin: 1rem 0;
    }
    .status-box {
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
    }
    .success-box {
        background-color: #d4edda;
        border: 1px solid #c3e6cb;
        color: #155724;
    }
    .error-box {
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
    }
    .info-box {
        background-color: #d1ecf1;
        border: 1px solid #bee5eb;
        color: #0c5460;
    }
    .metric-card {
        background: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        text-align: center;
        margin: 0.5rem;
    }
</style>
""", unsafe_allow_html=True)

def create_directories():
    """Ensure required directories exist"""
    directories = [
        "inputs",
        "outputs",
        "temp"
    ]
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)

def save_uploaded_files(uploaded_files):
    """Save uploaded files to the input directory"""
    saved_files = []
    input_dir = Path("inputs")
    
    for uploaded_file in uploaded_files:
        if uploaded_file is not None:
            file_path = input_dir / uploaded_file.name
            with open(file_path, "wb") as f:
                f.write(uploaded_file.getbuffer())
            saved_files.append(str(file_path))
    
    return saved_files

def run_motia_pipeline():
    """Run the Motia OCR pipeline"""
    try:
        # Run the Motia flow
        result = subprocess.run(
            ["motia", "run", "flows/flow_invoice_ocr.yml"],
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Pipeline timed out after 5 minutes"
    except FileNotFoundError:
        return False, "", "Motia CLI not found. Please install Motia first."
    except Exception as e:
        return False, "", str(e)

def load_results():
    """Load and display results"""
    csv_file = Path("outputs/invoice_data.csv")
    html_file = Path("outputs/invoice_summary.html")
    
    results = {}
    
    if csv_file.exists():
        try:
            df = pd.read_csv(csv_file)
            results['csv'] = df
        except Exception as e:
            st.error(f"Error reading CSV: {e}")
    
    if html_file.exists():
        results['html'] = str(html_file)
    
    return results

def display_metrics(df):
    """Display summary metrics"""
    if df is None or df.empty:
        return
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Invoices Processed", len(df))
    
    with col2:
        total_amount = df['total_amount'].sum() if 'total_amount' in df.columns else 0
        st.metric("Total Amount", f"${total_amount:,.2f}")
    
    with col3:
        avg_amount = df['total_amount'].mean() if 'total_amount' in df.columns else 0
        st.metric("Average Amount", f"${avg_amount:,.2f}")
    
    with col4:
        unique_vendors = df['vendor_name'].nunique() if 'vendor_name' in df.columns else 0
        st.metric("Unique Vendors", unique_vendors)

def main():
    """Main application function"""
    
    # Header
    st.markdown("""
    <div class="main-header">
        <h1>📄 Motia Invoice OCR</h1>
        <p>Upload invoice documents and extract structured data using AI-powered OCR</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Create required directories
    create_directories()
    
    # Sidebar
    with st.sidebar:
        st.header("⚙️ Settings")
        
        # OCR engine selection
        ocr_engine = st.selectbox(
            "OCR Engine",
            ["Tesseract", "Mistral OCR (when available)"],
            help="OCR engine to use for text extraction"
        )
        
        # Processing options
        st.subheader("Processing Options")
        batch_processing = st.checkbox("Enable batch processing", value=True)
        generate_summary = st.checkbox("Generate HTML summary", value=True)
        
        # System info
        st.subheader("ℹ️ System Info")
        st.info(f"Engine: {ocr_engine}")
        st.info("Platform: Local Processing")
        st.info("Privacy: 100% Offline")
    
    # Main content area
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.header("📁 Upload Invoice Documents")
        
        # File upload
        uploaded_files = st.file_uploader(
            "Choose invoice files",
            type=['pdf', 'jpg', 'jpeg', 'png', 'tiff', 'bmp'],
            accept_multiple_files=True,
            help="Supported formats: PDF, JPG, PNG, TIFF, BMP"
        )
        
        if uploaded_files:
            st.success(f"📎 {len(uploaded_files)} file(s) selected")
            
            # Show file details
            file_details = []
            for file in uploaded_files:
                file_details.append({
                    "Name": file.name,
                    "Size": f"{file.size / 1024 / 1024:.1f} MB",
                    "Type": file.type
                })
            
            st.dataframe(pd.DataFrame(file_details))
    
    with col2:
        st.header("🚀 Process")
        
        if uploaded_files:
            if st.button("🎯 Start OCR Processing", type="primary"):
                with st.spinner("Processing documents..."):
                    # Save uploaded files
                    saved_files = save_uploaded_files(uploaded_files)
                    
                    # Run pipeline
                    success, stdout, stderr = run_motia_pipeline()
                    
                    if success:
                        st.success("✅ Processing completed successfully!")
                        st.session_state.processing_complete = True
                    else:
                        st.error("❌ Processing failed")
                        st.error(f"Error: {stderr}")
                        
                        # Show detailed output for debugging
                        with st.expander("Debug Information"):
                            st.text("STDOUT:")
                            st.code(stdout)
                            st.text("STDERR:")
                            st.code(stderr)
        else:
            st.info("📁 Please upload invoice documents to begin")
    
    # Results section
    if st.session_state.get('processing_complete', False) or Path("outputs/invoice_data.csv").exists():
        st.header("📊 Results")
        
        results = load_results()
        
        if 'csv' in results:
            df = results['csv']
            
            # Display metrics
            display_metrics(df)
            
            # Display data
            st.subheader("📋 Extracted Invoice Data")
            st.dataframe(df, use_container_width=True)
            
            # Download options
            col1, col2 = st.columns(2)
            
            with col1:
                # CSV download
                csv_data = df.to_csv(index=False)
                st.download_button(
                    label="📥 Download CSV",
                    data=csv_data,
                    file_name=f"invoice_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                    mime="text/csv"
                )
            
            with col2:
                # HTML summary
                if 'html' in results:
                    with open(results['html'], 'r', encoding='utf-8') as f:
                        html_content = f.read()
                    
                    st.download_button(
                        label="📄 Download HTML Summary",
                        data=html_content,
                        file_name=f"invoice_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html",
                        mime="text/html"
                    )
                    
                    # Display HTML summary
                    st.subheader("📄 Summary Report Preview")
                    st.components.v1.html(html_content, height=600, scrolling=True)
        
        # Individual invoice details
        if 'csv' in results and not results['csv'].empty:
            st.subheader("🔍 Invoice Details")
            
            selected_invoice = st.selectbox(
                "Select an invoice to view details:",
                results['csv']['filename'].tolist()
            )
            
            if selected_invoice:
                invoice_data = results['csv'][results['csv']['filename'] == selected_invoice].iloc[0]
                
                col1, col2 = st.columns(2)
                
                with col1:
                    st.markdown("**📅 Invoice Date**")
                    st.write(invoice_data.get('date', 'Not extracted'))
                    
                    st.markdown("**💰 Total Amount**")
                    amount = invoice_data.get('total_amount', 'Not extracted')
                    if amount and amount != 'Not extracted':
                        st.write(f"${amount:,.2f}")
                    else:
                        st.write(amount)
                    
                    st.markdown("**🏢 Vendor Name**")
                    st.write(invoice_data.get('vendor_name', 'Not extracted'))
                
                with col2:
                    st.markdown("**🔢 Invoice Number**")
                    st.write(invoice_data.get('invoice_number', 'Not extracted'))
                    
                    st.markdown("**💱 Currency**")
                    st.write(invoice_data.get('currency', 'Not extracted'))
                    
                    st.markdown("**📄 Raw Text**")
                    raw_text = invoice_data.get('raw_text', 'No text available')
                    st.text_area("Extracted Text", raw_text, height=200, disabled=True)
    
    # Footer
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #666;">
        <p>Built with ❤️ using Motia, OCR, and Streamlit</p>
        <p>100% Local Processing • No Data Leaves Your Machine</p>
    </div>
    """, unsafe_allow_html=True)

if __name__ == "__main__":
    main() 