class ChatBot {
  constructor() {
    this.previousLastGroupContent = null;
  }

  async start() {
    const newChatLink = Array.from(document.querySelectorAll("a")).find(
      (anchor) => anchor.innerText === "New Chat"
    );
    if (newChatLink) {
      newChatLink.click();
    } else {
      console.error('Could not find the "New Chat" link.');
    }
  }

  async sendChunks(chunks) {
    let combinedResponse = { raw: "", code: [] };

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const preamble =
        i === chunks.length - 1
          ? "This is the final chunk, please respond to all chunks."
          : `This is chunk ${i + 1} of ${
              chunks.length
            }, please respond with 'ACK' and wait for the rest.`;
      const postscript =
        i === chunks.length - 1
          ? "This is the final chunk, please respond to all chunks."
          : `End chunk ${i + 1} of ${
              chunks.length
            }, remember to respond with 'ACK' for more chunks.`;
      const response = await this.request(
        `${preamble} ${chunk} ${postscript}`,
        3000,
        true
      );

      if (response.raw.trim().endsWith("ACK") || i === chunks.length - 1) {
        combinedResponse.raw += response.raw + " ";
        combinedResponse.code = combinedResponse.code.concat(response.code);
      }
    }

    return combinedResponse;
  }

  async request(text, timeout = 3000, skipChunking = false) {
    return new Promise(async (resolve) => {
      const processResponse = async ({ raw, code }) => {
        if (!(raw.endsWith("EOF") || raw.trim().endsWith("ACK"))) {
          const continuation = await this.request("continue", timeout);
          return {
            raw: raw + continuation.raw,
            code: code.concat(continuation.code),
          };
        } else if (raw.endsWith("EOF")) {
          raw = raw.slice(0, -3).trim(); // Remove the 'EOF'
          return { raw, code };
        } else {
          return { raw, code };
        }
      };

      if (!skipChunking) {
        if (text !== "continue") {
          text += " finish your response with 'EOF' so I know you're done";
        }

        if (text.split(/\s+/).length > 2000) {
          const words = text.split(/\s+/);
          const chunks = [];

          while (words.length) {
            chunks.push(words.splice(0, 2000).join(" "));
          }

          const chunkResponse = await this.sendChunks(chunks);
          resolve(chunkResponse);
          return;
        }
      }

      const textbox = document.querySelector("textarea");
      const sendButton = textbox.nextElementSibling;

      if (sendButton.hasAttribute("disabled")) {
        sendButton.removeAttribute("disabled");
      }

      textbox.value = text;
      sendButton.click();

      const checkLastGroup = async () => {
        const lastGroup = Array.from(
          document.querySelectorAll("div.group")
        ).pop();
        const lastGroupContent = lastGroup.textContent || "";

        if (this.previousLastGroupContent !== lastGroupContent) {
          this.previousLastGroupContent = lastGroupContent;
          setTimeout(checkLastGroup, timeout);
        } else {
          const codeElements = lastGroup.querySelectorAll(
            "code.language-javascript"
          );
          const code = Array.from(codeElements).map(
            (codeElement) => codeElement.textContent
          );

          const response = await processResponse({
            raw: lastGroupContent,
            code,
          });
          resolve(response);
        }
      };

      setTimeout(checkLastGroup, timeout);
    });
  }
}
