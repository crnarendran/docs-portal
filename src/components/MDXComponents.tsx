import React from 'react';
import { Mermaid } from './Mermaid';

// Custom pre/code blocks for next-mdx-remote
export const mdxComponents = {
  code: (props: any) => {
    const { className, children } = props;
    const isMermaid = className && className.includes('language-mermaid');
    
    if (isMermaid && typeof children === 'string') {
      return <Mermaid chart={children} />;
    }
    
    return <code {...props} />;
  },
  pre: (props: any) => {
    const { children, className: preClassName } = props;
    let isMermaid = false;
    let codeContent = '';

    if (typeof preClassName === 'string' && preClassName.includes('language-mermaid')) {
      isMermaid = true;
    }

    const childArr = Array.isArray(children) ? children : [children];
    for (const child of childArr) {
      if (React.isValidElement(child)) {
        const childClassName = (child.props as any).className || '';
        if (typeof childClassName === 'string' && childClassName.includes('language-mermaid')) {
          isMermaid = true;
          codeContent = (child.props as any).children;
          break;
        }
        
        // Sniff content if class is missing
        const text = (child.props as any).children;
        if (typeof text === 'string' && (text.trim().startsWith('graph ') || text.trim().startsWith('sequenceDiagram'))) {
          isMermaid = true;
          codeContent = text;
          break;
        }
      }
    }

    // If we only found it on the pre tag, we need to extract the text from children
    if (isMermaid && !codeContent) {
      for (const child of childArr) {
        if (React.isValidElement(child)) {
          codeContent = (child.props as any).children;
          break;
        } else if (typeof child === 'string') {
          codeContent = child;
          break;
        }
      }
    }

    if (isMermaid && typeof codeContent === 'string') {
      return <Mermaid chart={codeContent} />;
    }

    return <pre {...props} />;
  }
};
