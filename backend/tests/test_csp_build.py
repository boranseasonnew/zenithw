import importlib.util
import errno
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

SOURCE = Path(__file__).resolve().parents[2] / 'scripts/update_csp.py'
spec = importlib.util.spec_from_file_location('csp_build', SOURCE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CspBuildTests(unittest.TestCase):
    def test_unchanged_security_files_are_not_rewritten(self):
        path = Mock()
        module.write_if_changed(path, 'same', 'same')
        path.write_text.assert_not_called()

    def test_transient_file_locks_retry_without_suppressing_real_failures(self):
        path = Mock()
        path.write_text.side_effect = [OSError(errno.EINVAL, 'busy'), None]
        with patch.object(module.time, 'sleep'):
            module.write_if_changed(path, 'new', 'old')
        self.assertEqual(path.write_text.call_count, 2)
        path.write_text.side_effect = OSError(errno.ENOSPC, 'full')
        with self.assertRaises(OSError):
            module.write_if_changed(path, 'new', 'old')


if __name__ == '__main__':
    unittest.main()
