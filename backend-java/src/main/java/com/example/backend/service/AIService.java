package com.example.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AIService {

    @Value("${app.deepseek.api-key}")
    private String apiKey;

    private final String API_URL = "https://api.deepseek.com/chat/completions";

    public Map<String, Object> chat(List<Map<String, Object>> messages) {
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = new HashMap<>();
        body.put("model", "deepseek-chat");

        // Add system prompt if not present (simplified logic)
        // In reality we trust the controller/frontend to pass history, or inject system
        // prompt here
        // Based on JS code, it injects system prompt first.

        messages.add(0, Map.of(
                "role", "system",
                "content", "你是“情绪搭子”，一个温暖、富有同理心的倾听者。你的目标是为用户提供情感支持、安慰和正能量。请保持回复简洁（100字以内）、友好且从容。不要像机器人一样回答，要像一个知心朋友。"));

        body.put("messages", messages);
        body.put("stream", false);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(API_URL, request, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (choices != null && !choices.isEmpty()) {
                    return (Map<String, Object>) choices.get(0).get("message");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("AI Service Unavailable");
        }
        return Map.of("content", "Sorry, I couldn't process that.");
    }
}
