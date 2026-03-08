<?php
// update_job.php
require_once 'config.php';

header('Content-Type: application/json');

// Aktifkan error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method tidak diizinkan');
    }

    // Log untuk debugging
    error_log("Update job - POST data: " . print_r($_POST, true));

    $job_id = intval($_POST['job_id'] ?? 0);
    $action = $_POST['action'] ?? '';
    $user_id = intval($_POST['user_id'] ?? 0);

    if (!$job_id) {
        throw new Exception('ID pekerjaan tidak valid');
    }

    if (!$action) {
        throw new Exception('Aksi tidak ditentukan');
    }

    if (!$user_id) {
        throw new Exception('User ID tidak valid');
    }

    // Cek apakah kolom helper_id ada, jika tidak tambahkan
    $check_column = $conn->query("SHOW COLUMNS FROM jobs LIKE 'helper_id'");
    if ($check_column->num_rows === 0) {
        $conn->query("ALTER TABLE jobs ADD COLUMN helper_id INT NULL AFTER user_id");
        error_log("Kolom helper_id ditambahkan");
    }

    switch ($action) {
        case 'take':
            // Ambil pekerjaan (helper)
            $update = $conn->prepare("UPDATE jobs SET status = 'in-progress', helper_id = ? WHERE id = ? AND status = 'open'");
            $update->bind_param("ii", $user_id, $job_id);
            break;
            
        case 'complete':
            // Selesaikan pekerjaan
            $update = $conn->prepare("UPDATE jobs SET status = 'completed' WHERE id = ? AND (user_id = ? OR helper_id = ?)");
            $update->bind_param("iii", $job_id, $user_id, $user_id);
            break;
            
        default:
            throw new Exception('Aksi tidak dikenal: ' . $action);
    }

    if (!$update) {
        throw new Exception('Gagal prepare statement: ' . $conn->error);
    }

    if (!$update->execute()) {
        throw new Exception('Gagal execute query: ' . $update->error);
    }

    if ($update->affected_rows === 0) {
        // Cek apakah job masih ada
        $check_job = $conn->prepare("SELECT id, status, user_id, helper_id FROM jobs WHERE id = ?");
        $check_job->bind_param("i", $job_id);
        $check_job->execute();
        $job_result = $check_job->get_result();
        
        if ($job_result->num_rows === 0) {
            throw new Exception('Pekerjaan tidak ditemukan');
        } else {
            $job = $job_result->fetch_assoc();
            if ($action === 'take' && $job['status'] !== 'open') {
                throw new Exception('Pekerjaan sudah diambil orang lain atau sudah selesai');
            } elseif ($action === 'complete' && $job['user_id'] != $user_id && $job['helper_id'] != $user_id) {
                throw new Exception('Anda tidak memiliki akses untuk menyelesaikan pekerjaan ini');
            } else {
                throw new Exception('Tidak ada perubahan data');
            }
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Pekerjaan berhasil diupdate'
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($update)) $update->close();
    if (isset($check_job)) $check_job->close();
    if (isset($conn)) $conn->close();
}
?>