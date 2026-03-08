<?php
// get_jobs.php
require_once 'config.php';

header('Content-Type: application/json');

try {
    $type = $_GET['type'] ?? 'all'; // all, requester, helper
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
    
    $query = "SELECT j.*, u.nama_lengkap as requester_name,
              h.nama_lengkap as helper_name
              FROM jobs j 
              LEFT JOIN users u ON j.user_id = u.id 
              LEFT JOIN users h ON j.helper_id = h.id
              WHERE 1=1";
    
    $params = [];
    $types = "";
    
    if ($type === 'requester' && $user_id > 0) {
        $query .= " AND j.user_id = ?";
        $params[] = $user_id;
        $types .= "i";
    } elseif ($type === 'helper' && $user_id > 0) {
        $query .= " AND j.helper_id = ?";
        $params[] = $user_id;
        $types .= "i";
    } elseif ($type === 'open') {
        $query .= " AND j.status = 'open'";
    }
    
    $query .= " ORDER BY j.created_at DESC";
    
    $stmt = $conn->prepare($query);
    
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $jobs = [];
    while ($row = $result->fetch_assoc()) {
        $jobs[] = [
            'id' => $row['id'],
            'user_id' => $row['user_id'],
            'helper_id' => $row['helper_id'],
            'title' => $row['title'],
            'category' => $row['category'],
            'description' => $row['description'],
            'location' => $row['location'],
            'price' => floatval($row['price']),
            'status' => $row['status'],
            'emergency' => $row['emergency'] == 1,
            'distance' => $row['distance'],
            'favorite' => false, // Akan diimplementasikan nanti
            'date' => date('d/m/Y', strtotime($row['created_at'])),
            'created_at' => $row['created_at'],
            'requester_name' => $row['requester_name'],
            'helper_name' => $row['helper_name']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'jobs' => $jobs
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'jobs' => []
    ]);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($conn)) $conn->close();
}
?>