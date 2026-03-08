<?php
// get_wallet.php
require_once 'config.php';

header('Content-Type: application/json');

try {
    $user_id = intval($_GET['user_id'] ?? 0);

    if (!$user_id) {
        throw new Exception('User ID tidak ditemukan');
    }

    // Ambil saldo
    $select = $conn->prepare("SELECT wallet_balance FROM users WHERE id = ?");
    $select->bind_param("i", $user_id);
    $select->execute();
    $result = $select->get_result();
    $balance = $result->fetch_assoc()['wallet_balance'];

    // Ambil riwayat transaksi
    $transactions = [];
    $query = "SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $trans_result = $stmt->get_result();

    while ($row = $trans_result->fetch_assoc()) {
        $transactions[] = [
            'date' => date('Y-m-d', strtotime($row['created_at'])),
            'desc' => $row['description'],
            'amount' => ($row['type'] == 'topup' ? '+' : '-') . 'Rp ' . number_format($row['amount'], 0, ',', '.'),
            'status' => $row['status'] == 'success' ? 'Sukses' : ucfirst($row['status'])
        ];
    }

    echo json_encode([
        'success' => true,
        'balance' => floatval($balance),
        'transactions' => $transactions
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($select)) $select->close();
    if (isset($stmt)) $stmt->close();
    if (isset($conn)) $conn->close();
}
?>