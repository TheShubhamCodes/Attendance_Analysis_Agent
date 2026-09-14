const agentNluService = require('../services/agentNluService');

async function chat(req, res) {
  try {
    const { message, sessionId = 'default' } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required.',
      });
    }

    const response = await agentNluService.processUserMessage(req.user, {
      message: message.trim(),
      sessionId,
    });

    return res.status(200).json({
      success: true,
      message: response.message,
      data: response,
    });
  } catch (error) {
    console.error('Agent Controller chat error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process agent query.',
    });
  }
}

async function getSuggestions(req, res) {
  try {
    const suggestions = agentNluService.getSuggestionsForRole(req.user.role);
    return res.status(200).json({
      success: true,
      data: { suggestions },
    });
  } catch (error) {
    console.error('Agent Controller suggestions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch suggestions.',
    });
  }
}

async function clearSession(req, res) {
  try {
    const { sessionId = 'default' } = req.body;
    agentNluService.clearSessionContext(req.user.id, sessionId);
    return res.status(200).json({
      success: true,
      message: 'Conversation context cleared successfully.',
    });
  } catch (error) {
    console.error('Agent Controller clearSession error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear session context.',
    });
  }
}

module.exports = {
  chat,
  getSuggestions,
  clearSession,
};
