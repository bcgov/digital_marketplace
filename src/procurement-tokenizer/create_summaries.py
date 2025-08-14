#!/usr/bin/env python3
"""
Create Summaries for Procurement Documents

This script reads full text documents and creates compressed summaries
that preserve essential procurement rules, restrictions, regulations, and 
opportunity review criteria. Designed for prompt augmentation in the 
Digital Marketplace AI system to enhance opportunity submission reviews.
"""

import os
import sys
import logging
import click
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
import json
import re
import tiktoken

# Add shared modules to path
sys.path.append(str(Path(__file__).parent.parent / "shared" / "lib"))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('create_summaries.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Configuration
DEFAULT_INPUT_DIR = "../../chroma_data/procurement_docs/full_text"
DEFAULT_OUTPUT_DIR = "../../chroma_data/procurement_docs/summaries"
DEFAULT_MODEL = "gpt-4o-mini"  # Cost-effective model for summaries
TARGET_COMPRESSION_RATIO = 0.1  # Aim for 90% compression (10% of original size)

class ProcurementSummarizer:
    """Creates focused summaries of procurement documents with emphasis on opportunity review criteria."""
    
    def __init__(self, model: str = DEFAULT_MODEL):
        self.model = model
        self.encoding = tiktoken.encoding_for_model("gpt-4")
        
    def count_tokens(self, text: str) -> int:
        """Count tokens in text."""
        return len(self.encoding.encode(text))
    
    def create_summary_prompt(self, document_text: str, target_tokens: int) -> str:
        """Create a prompt for summarizing procurement documents with focus on opportunity review criteria."""
        
        return f"""You are a BC Government procurement specialist tasked with creating a compressed summary of a procurement document. 

CRITICAL REQUIREMENTS:
1. Target length: approximately {target_tokens} tokens
2. Focus on opportunity review criteria, compliance requirements, and best practices
3. Preserve ALL essential information for reviewing Team With Us and Sprint With Us opportunities
4. Include specific requirements for organization details, timelines, budgets, and vendor guidance
5. Maintain legal accuracy - do not paraphrase legal requirements
6. Use bullet points and structured format for clarity

DOCUMENT TO SUMMARIZE:
{document_text}

SUMMARY FORMAT:
# [Document Title/Type]

## Organization & Legal Requirements
- [Legal requirements for purchasing organization identification]
- [Compliance requirements]
- [etc.]

## Contract & Service Requirements
- [Contract outcomes requirements]
- [Service area responsibilities]
- [Role and task specifications]
- [etc.]

## Skills & Qualification Standards
- [Mandatory skills requirements]
- [Minimum experience standards]
- [Evaluation criteria]
- [etc.]

## Timeline & Planning Requirements
- [Procurement timeline standards]
- [Minimum posting periods]
- [Evaluation timeframes]
- [etc.]

## Budget & Financial Guidelines
- [Budget guidance requirements]
- [Standard rates and calculations]
- [Financial planning standards]
- [etc.]

## Vendor & Proposal Guidelines
- [Information requirements for vendors]
- [Proposal submission standards]
- [Quality expectations]
- [etc.]

## Compliance & Review Criteria
- [Review criteria and standards]
- [Common deficiencies to avoid]
- [Best practices]
- [etc.]

CREATE SUMMARY:"""

    def get_local_summary(self, document_text: str, target_tokens: int) -> str:
        """Create summary using local processing focusing on opportunity review criteria."""
        
        # Extract key sections using patterns focused on opportunity review areas
        opportunity_review_patterns = [
            # Organization & Legal Requirements
            r'(?i)(purchasing organization|legal requirements?|ministry|department|division)',
            r'(?i)(organization identification|background|importance of work)',
            r'(?i)(reason for procurement|why.*buy)',
            
            # Contract & Service Requirements  
            r'(?i)(contract outcomes?|deliverables?|responsibilities)',
            r'(?i)(service area|role responsibilities|task descriptions?)',
            r'(?i)(outcomes?.*align|responsibilities.*detail)',
            
            # Skills & Qualification Standards
            r'(?i)(mandatory skills?|minimum standards?|required skills?)',
            r'(?i)(years? of experience|minimum requirements?|qualifications?)',
            r'(?i)(evaluation criteria|skills? challenge|minimum standards?)',
            
            # Timeline & Planning Requirements
            r'(?i)(procurement timeline|posting period|evaluation.*time)',
            r'(?i)(minimum.*days?|posting.*period|timeline.*planning)',
            r'(?i)(skills? challenge.*week|evaluation.*week)',
            
            # Budget & Financial Guidelines
            r'(?i)(budget guidance|budget.*align|20-25k|monthly.*rate)',
            r'(?i)(total budget|240-300k|financial.*expectation)',
            r'(?i)(budget.*calculation|standard.*rate)',
            
            # Contract Extensions & Legal
            r'(?i)(contract extension|legal language|team with us.*allow)',
            r'(?i)(extension.*length|contract.*extend)',
            
            # Vendor & Proposal Guidelines
            r'(?i)(vendor.*information|proposal.*quality|submission.*standard)',
            r'(?i)(inadequate.*detail|vendor.*deter|proposal.*preparation)',
            
            # General compliance and requirements
            r'(?i)(must|shall|required|mandatory|obligation|compliance)',
            r'(?i)(deadline|due date|submission date|closing date)',
            r'(?i)(criteria|requirement|standard|guideline|procedure)'
        ]
        
        # Split document into sentences
        sentences = re.split(r'[.!?]+', document_text)
        important_sentences = []
        
        # Score sentences based on opportunity review relevance
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) < 10:
                continue
                
            score = 0
            for pattern in opportunity_review_patterns:
                matches = len(re.findall(pattern, sentence))
                score += matches
            
            if score > 0:
                important_sentences.append((sentence, score))
        
        # Sort by importance and select top sentences
        important_sentences.sort(key=lambda x: x[1], reverse=True)
        
        # Build summary within token limit
        current_tokens = 0
        summary_parts = []
        
        for sentence, score in important_sentences:
            sentence_tokens = self.count_tokens(sentence)
            if current_tokens + sentence_tokens <= target_tokens:
                summary_parts.append(sentence)
                current_tokens += sentence_tokens
            else:
                break
        
        # Format as structured summary for opportunity review
        summary = "# Procurement Document Summary - Opportunity Review Focus\n\n"
        summary += "## Essential Opportunity Review Criteria\n"
        
        for part in summary_parts:
            summary += f"- {part.strip()}\n"
        
        return summary
    
    def create_summary(self, document_text: str, document_name: str, use_openai: bool = False) -> Dict[str, Any]:
        """Create a compressed summary of a procurement document focused on opportunity review criteria."""
        
        original_tokens = self.count_tokens(document_text)
        target_tokens = max(100, int(original_tokens * TARGET_COMPRESSION_RATIO))
        
        logger.info(f"Creating summary for {document_name}")
        logger.info(f"Original tokens: {original_tokens:,}")
        logger.info(f"Target tokens: {target_tokens:,}")
        
        if use_openai:
            try:
                import openai
                
                prompt = self.create_summary_prompt(document_text, target_tokens)
                
                response = openai.ChatCompletion.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a BC Government procurement specialist focused on opportunity review criteria and compliance standards for Team With Us and Sprint With Us opportunities."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=target_tokens,
                    temperature=0.1
                )
                
                summary = response.choices[0].message.content
                method = "openai"
                
            except Exception as e:
                logger.warning(f"OpenAI API failed: {e}, falling back to local processing")
                summary = self.get_local_summary(document_text, target_tokens)
                method = "local_fallback"
        else:
            summary = self.get_local_summary(document_text, target_tokens)
            method = "local"
        
        actual_tokens = self.count_tokens(summary)
        compression_ratio = actual_tokens / original_tokens if original_tokens > 0 else 0
        
        logger.info(f"Summary created: {actual_tokens:,} tokens ({compression_ratio:.1%} of original)")
        
        return {
            'summary': summary,
            'metadata': {
                'document_name': document_name,
                'original_tokens': original_tokens,
                'summary_tokens': actual_tokens,
                'compression_ratio': compression_ratio,
                'target_tokens': target_tokens,
                'method': method,
                'created_at': datetime.now().isoformat()
            }
        }

class DocumentProcessor:
    """Process documents for summarization."""
    
    def __init__(self, input_dir: str, output_dir: str):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def find_documents(self) -> List[Path]:
        """Find all text documents to process."""
        if not self.input_dir.exists():
            raise FileNotFoundError(f"Input directory not found: {self.input_dir}")
        
        # Find all .txt files
        txt_files = list(self.input_dir.glob("*.txt"))
        
        logger.info(f"Found {len(txt_files)} documents to process")
        return txt_files
    
    def read_document(self, doc_path: Path) -> str:
        """Read document content."""
        try:
            with open(doc_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Remove metadata header (everything before the separator line)
            if '=' * 80 in content:
                parts = content.split('=' * 80, 1)
                if len(parts) > 1:
                    content = parts[1].strip()
            
            return content
        except Exception as e:
            logger.error(f"Failed to read {doc_path}: {e}")
            return ""
    
    def save_summary(self, summary_data: Dict[str, Any], output_path: Path):
        """Save summary and metadata."""
        try:
            # Save summary text
            summary_text_path = output_path.with_suffix('.txt')
            with open(summary_text_path, 'w', encoding='utf-8') as f:
                f.write(summary_data['summary'])
            
            # Save metadata
            metadata_path = output_path.with_suffix('.json')
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(summary_data['metadata'], f, indent=2, ensure_ascii=False)
            
            logger.info(f"Saved summary to: {summary_text_path}")
            logger.info(f"Saved metadata to: {metadata_path}")
            
        except Exception as e:
            logger.error(f"Failed to save summary: {e}")

def create_processing_report(summaries: List[Dict[str, Any]], output_dir: Path):
    """Create a report of the summarization process."""
    
    report_path = output_dir / "summarization_report.json"
    
    total_original_tokens = sum(s['metadata']['original_tokens'] for s in summaries)
    total_summary_tokens = sum(s['metadata']['summary_tokens'] for s in summaries)
    overall_compression = total_summary_tokens / total_original_tokens if total_original_tokens > 0 else 0
    
    report = {
        'summary_stats': {
            'total_documents': len(summaries),
            'total_original_tokens': total_original_tokens,
            'total_summary_tokens': total_summary_tokens,
            'overall_compression_ratio': overall_compression,
            'average_compression_ratio': sum(s['metadata']['compression_ratio'] for s in summaries) / len(summaries) if summaries else 0,
            'processing_date': datetime.now().isoformat()
        },
        'document_details': [s['metadata'] for s in summaries]
    }
    
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Processing report saved to: {report_path}")
    logger.info(f"Overall compression: {overall_compression:.1%}")
    logger.info(f"Token reduction: {total_original_tokens:,} → {total_summary_tokens:,}")

@click.command()
@click.option('--input-dir', default=DEFAULT_INPUT_DIR, help='Directory containing full text documents')
@click.option('--output-dir', default=DEFAULT_OUTPUT_DIR, help='Directory to save summaries')
@click.option('--model', default=DEFAULT_MODEL, help='Model to use for summarization')
@click.option('--use-openai', is_flag=True, help='Use OpenAI API (requires API key)')
@click.option('--compression-ratio', default=TARGET_COMPRESSION_RATIO, help='Target compression ratio (0.1 = 90% compression)')
@click.option('--document', help='Process specific document only')
def main(input_dir, output_dir, model, use_openai, compression_ratio, document):
    """
    Create compressed summaries of procurement documents for opportunity review.
    
    This script processes full text documents and creates focused summaries
    that preserve essential opportunity review criteria, compliance requirements,
    and best practices for Team With Us and Sprint With Us opportunity reviews
    while maximizing compression for prompt augmentation.
    """
    
    print("📋 Procurement Document Summarizer - Opportunity Review Focus")
    print("=" * 60)
    
    # Update global compression ratio
    global TARGET_COMPRESSION_RATIO
    TARGET_COMPRESSION_RATIO = compression_ratio
    
    logger.info(f"Input directory: {input_dir}")
    logger.info(f"Output directory: {output_dir}")
    logger.info(f"Model: {model}")
    logger.info(f"Use OpenAI: {use_openai}")
    logger.info(f"Target compression: {compression_ratio:.1%}")
    
    try:
        # Initialize components
        processor = DocumentProcessor(input_dir, output_dir)
        summarizer = ProcurementSummarizer(model)
        
        # Find documents to process
        documents = processor.find_documents()
        
        if document:
            # Process specific document
            doc_path = Path(input_dir) / document
            if not doc_path.exists():
                logger.error(f"Document not found: {doc_path}")
                return
            documents = [doc_path]
        
        if not documents:
            logger.error("No documents found to process")
            return
        
        # Process documents
        summaries = []
        
        for doc_path in documents:
            print(f"\n📄 Processing: {doc_path.name}")
            
            # Read document
            content = processor.read_document(doc_path)
            if not content.strip():
                logger.warning(f"Empty document: {doc_path.name}")
                continue
            
            # Create summary
            summary_data = summarizer.create_summary(
                content, 
                doc_path.name, 
                use_openai
            )
            
            # Save summary
            output_path = Path(output_dir) / doc_path.stem
            processor.save_summary(summary_data, output_path)
            
            summaries.append(summary_data)
            
            # Show progress
            ratio = summary_data['metadata']['compression_ratio']
            print(f"   ✅ Compressed to {ratio:.1%} of original size")
        
        # Create processing report
        create_processing_report(summaries, Path(output_dir))
        
        print(f"\n🎉 Summarization complete!")
        print(f"📊 Processed {len(summaries)} documents")
        print(f"💾 Summaries saved to: {output_dir}")
        print(f"📈 Report: {output_dir}/summarization_report.json")
        
    except Exception as e:
        logger.error(f"Summarization failed: {e}")
        print(f"\n❌ Error: {e}")
        raise

if __name__ == "__main__":
    main() 