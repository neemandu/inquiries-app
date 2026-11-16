import MaskIcon from '@/components/mobile/MaskIcon';
import { mobileOutlineButton, mobilePrimaryButton } from '@/components/auth/MobileAuthHeader';

// "Scan / upload new document" button shown at the bottom of mobile screens
export default function UploadButton({ onClick, variant = 'primary' }: { onClick: () => void; variant?: 'primary' | 'outline' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={variant === 'outline' ? mobileOutlineButton : `${mobilePrimaryButton} gap-2`}
    >
      <MaskIcon src="/icons/mobile/camera.svg" size={20} />
      סרוק / העלה מסמך חדש
    </button>
  );
}
