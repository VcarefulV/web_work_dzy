package com.example.backend.service;

import com.example.backend.model.Comment;
import com.example.backend.model.Post;
import com.example.backend.model.User;
import com.example.backend.repository.CommentRepository;
import com.example.backend.repository.PostRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CommentService {

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private UserRepository userRepository;

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Value("${server.port}")
    private String serverPort;

    public List<Map<String, Object>> getCommentsByPost(Long postId) {
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public Map<String, Object> createComment(Long userId, Long postId, String content, String imageBase64) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Post post = postRepository.findById(postId).orElseThrow(() -> new RuntimeException("Post not found"));

        Comment comment = new Comment();
        comment.setContent(content);
        comment.setUser(user);
        comment.setPost(post);

        if (imageBase64 != null && imageBase64.startsWith("data:image")) {
            try {
                String fileName = "comment_" + userId + "_" + System.currentTimeMillis() + ".png";
                String timestampFolder = String.valueOf(System.currentTimeMillis());
                Path uploadPath = Paths.get(uploadDir, "comments", timestampFolder);

                if (!Files.exists(uploadPath)) {
                    Files.createDirectories(uploadPath);
                }

                String base64Data = imageBase64.replaceFirst("^data:image/[a-zA-Z0-9]+;base64,", "");
                byte[] decodedBytes = Base64.getDecoder().decode(base64Data);
                Path filePath = uploadPath.resolve(fileName);
                Files.write(filePath, decodedBytes);

                String imageUrl = "http://localhost:" + serverPort + "/uploads/comments/" + timestampFolder + "/"
                        + fileName;
                comment.setImage(imageUrl);

            } catch (IOException e) {
                e.printStackTrace();
            }
        }

        Comment saved = commentRepository.save(comment);
        return convertToDto(saved);
    }

    private Map<String, Object> convertToDto(Comment comment) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", comment.getId());
        map.put("content", comment.getContent());
        map.put("image", comment.getImage());
        map.put("createdAt", comment.getCreatedAt());

        Map<String, Object> author = new HashMap<>();
        author.put("username", comment.getUser().getUsername());
        author.put("avatar", comment.getUser().getAvatar());
        map.put("author", author);

        return map;
    }
}
