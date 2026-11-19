import Document, { Html, Head, Main, NextScript, DocumentContext, DocumentInitialProps } from 'next/document';
import { ServerStyleSheet } from 'styled-components';

interface DocumentProps extends DocumentInitialProps {
  nonce?: string;
}

export default class MyDocument extends Document<DocumentProps> {
  static async getInitialProps(ctx: DocumentContext): Promise<DocumentProps> {
    const nonce = ctx.req?.headers['x-nonce'] as string | undefined;
    const sheet = new ServerStyleSheet({ nonce });
    const originalRenderPage = ctx.renderPage;

    try {
      ctx.renderPage = () =>
        originalRenderPage({
          enhanceApp: (App) => (props) => sheet.collectStyles(<App {...props} />),
          enhanceComponent: (Component) => Component,
        });

      const initialProps = await Document.getInitialProps(ctx);

      return {
        ...initialProps,
        styles: [initialProps.styles, sheet.getStyleElement()],
        nonce,
      };
    } finally {
      sheet.seal();
    }
  }

  render() {
    const { nonce } = this.props;
    // Runs before any chunk so the CSP nonce reaches runtime-injected <style> tags:
    // - styled-components (v6, and the v5 bundled by @button-inc/component-library) reads __webpack_nonce__.
    // - Emotion (react-select) gets the nonce from the CacheProvider in _app (utils/emotion-cache.ts).
    // - FontAwesome cannot nonce its injected <style>, so it is disabled; _app imports its CSS instead.
    const bootstrap = `${
      nonce ? `__webpack_nonce__=${JSON.stringify(nonce)};` : ''
    }window.FontAwesomeConfig={autoAddCss:false};`;
    return (
      <Html lang="en">
        <Head nonce={nonce}>
          <script nonce={nonce} dangerouslySetInnerHTML={{ __html: bootstrap }} />
        </Head>
        <body>
          <Main />
          <NextScript nonce={nonce} />
        </body>
      </Html>
    );
  }
}
