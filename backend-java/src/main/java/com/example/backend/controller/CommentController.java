package com.example.backend.controller;

import com.example.backend.service.CommentService;
import com.example.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/comments")
public class CommentController {

    @Autowired
    private CommentService commentService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> getComments(@RequestParam Long postId) {
        return ResponseEntity.ok(commentService.getCommentsByPost(postId));
    }

    @PostMapping
    public ResponseEntity<?> createComment(@RequestBody Map<String, Object> payload, Authentication authentication) {
        if (authentication == null)
            return ResponseEntity.status(401).build();
        Long userId = userRepository.findByUsername(authentication.getName()).get().getId();

        // Handle nested post object from frontend if needed, or postId
        Long postId = null;
        if (payload.get("postId") != null) {
            postId = Long.parseLong(payload.get("postId").toString());
        } else if (payload.get("post") != null) {
            Map<String, Object> postMap = (Map<String, Object>) payload.get("post");
            postId = Long.parseLong(postMap.get("id").toString());
        }

        if (postId == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Post ID required"));

        return ResponseEntity.ok(commentService.createComment(
                userId,
                postId,
                (String) payload.get("content"),
                (String) payload.get("image")));
    }
}
