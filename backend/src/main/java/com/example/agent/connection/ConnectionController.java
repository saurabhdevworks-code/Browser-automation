package com.example.agent.connection;
import com.example.agent.task.TaskRepository;
import com.example.agent.task.WorkerClient;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.net.*;
import java.util.*;
@RestController @RequestMapping("/api/v1/connections")
public class ConnectionController {
 private final ConnectionRepository repository;
 private final WorkerClient worker;
 private final TaskRepository taskRepository;
 public ConnectionController(ConnectionRepository repository, WorkerClient worker, TaskRepository taskRepository){
  this.repository=repository;
  this.worker=worker;
  this.taskRepository=taskRepository;
 }
 public record CreateConnection(@NotBlank @Size(max=160) String name,@NotBlank @Size(max=2048) String websiteUrl){}
 @PostMapping public ResponseEntity<WebsiteConnection> create(@Valid @RequestBody CreateConnection request) {
  URI uri=URI.create(request.websiteUrl());
  if (!List.of("http","https").contains(uri.getScheme()) || uri.getHost()==null || uri.getUserInfo()!=null)
   throw new IllegalArgumentException("Only absolute HTTP/HTTPS URLs without embedded credentials are accepted.");
  return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(new WebsiteConnection(request.name(),uri.toString())));
 }
 @GetMapping public List<WebsiteConnection> list(){return repository.findAll();}

 @DeleteMapping("/{id}")
 @Transactional
 public ResponseEntity<?> delete(@PathVariable UUID id) {
  var tasks = taskRepository.findByConnectionId(id);
  taskRepository.deleteAll(tasks);
  repository.deleteById(id);
  return ResponseEntity.noContent().build();
 }

 @PostMapping("/batch-delete")
 @Transactional
 public ResponseEntity<?> batchDelete(@RequestBody List<UUID> ids) {
  for (UUID id : ids) {
   var tasks = taskRepository.findByConnectionId(id);
   taskRepository.deleteAll(tasks);
   repository.deleteById(id);
  }
  return ResponseEntity.noContent().build();
 }

 @PostMapping("/{id}/launch-login")
 public ResponseEntity<?> launchLogin(@PathVariable UUID id) {
  var conn = repository.findById(id).orElseThrow(() -> new NoSuchElementException("Connection not found"));
  var res = worker.launchLogin(conn.getWebsiteUrl());
  return ResponseEntity.ok(res);
 }

 @PostMapping("/{id}/confirm-login")
 public ResponseEntity<?> confirmLogin(@PathVariable UUID id) {
  var conn = repository.findById(id).orElseThrow(() -> new NoSuchElementException("Connection not found"));
  var res = worker.confirmLogin();
  conn.setStatus("AUTHENTICATED");
  repository.save(conn);
  return ResponseEntity.ok(res);
 }

 @PostMapping("/{id}/cancel-login")
 public ResponseEntity<?> cancelLogin(@PathVariable UUID id) {
  var res = worker.cancelLogin();
  return ResponseEntity.ok(res);
 }
}
