export default class GptService {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async withErrorHandling(func, ...args) {
    try {
      return await func(...args);
    } catch (error) {
      console.log("ERROR: ", error);
      console.error(`Failed to ${func.name}:`, error);
      throw error;
    }
  }

  async getApiResponse(messages) {
    const url = "https://api.openai.com/v1/chat/completions";

    let headers = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    let body = {
      // model: "gpt-4",
      model: "gpt-4-1106-preview",
      messages: messages,
    };

    // console.log("messages", messages);

    const response = await this.withErrorHandling(fetch, url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // console.log("RESP GPT: ", data);
    // log very deep
    console.log("RESP GPT: ", JSON.stringify(data, null, 2));

    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    } else {
      console.log("data", data);
      return data;
      // return "error";
    }
  }
}
